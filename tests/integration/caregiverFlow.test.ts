import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/db";
import { advanceMedicationEvents } from "../../src/lib/engines/medicationEvents";
import { evaluateEligibility, mealUnlocksMedication } from "../../src/lib/engines/mealAware";
import { tickSimulator } from "../../src/lib/simulator";
import { adherenceForPatient } from "../../src/lib/engines/adherence";

describe("Caregiver flow integration test", () => {
  test("end-to-end caregiver path: meal recording -> dose eligibility -> dispense cycle -> confirmation", async () => {
    // 1. Setup Patient, Device, and Caregiver
    const patient = await prisma.patient.create({
      data: {
        mrn: "MRN-FLOW-999",
        name: "Eleanor Vance",
        dateOfBirth: new Date("1945-03-12"),
        emergencyName: "Thomas Vance",
        emergencyPhone: "555-0144",
      },
    });

    const device = await prisma.device.create({
      data: {
        serial: "MED-FLOW-DISPENSER",
        patientId: patient.id,
        online: true,
        simState: "READY",
        batteryPct: 98,
        slots: {
          create: [1, 2, 3, 4].map((slotIndex) => ({
            slotIndex,
            stock: "GOOD",
            count: 10,
          })),
        },
      },
    });

    const medication = await prisma.medication.create({
      data: { name: "Metformin", form: "tablet", strength: "500mg" },
    });

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const scheduledTime = `${hh}:${mm}`;

    const plan = await prisma.medicationPlan.create({
      data: {
        patientId: patient.id,
        medicationId: medication.id,
        dosage: "500mg",
        frequency: "Once daily",
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        scheduledTime,
        mealRelationship: "AFTER_MEAL",
        mealKind: "BREAKFAST",
        instructions: "Take immediately after morning meal",
        deviceSlot: 1,
        status: "ACTIVE",
      },
    });

    // 2. Advance events -> Event is created and becomes DUE
    await advanceMedicationEvents(now);

    let event = await prisma.medicationEvent.findFirst({
      where: { patientId: patient.id, planId: plan.id },
      include: { plan: { include: { medication: true } } },
    });
    assert.ok(event, "Medication event should be generated");
    assert.equal(event.state, "DUE", "Event should be DUE at scheduled time");

    // 3. Verify dose is NOT eligible yet because no verified meal exists
    let eligibility = await evaluateEligibility({
      patientId: patient.id,
      mealRelationship: plan.mealRelationship,
      mealKind: plan.mealKind,
      scheduledAt: event.scheduledAt,
      now,
    });
    assert.equal(eligibility.eligible, false, "Must not be eligible before meal");

    // 4. Record SENSOR_DETECTED meal event -> verify it does NOT unlock the dose!
    assert.equal(mealUnlocksMedication("SENSOR_DETECTED"), false);
    await prisma.mealEvent.create({
      data: {
        patientId: patient.id,
        kind: "BREAKFAST",
        eventType: "SENSOR_DETECTED",
        occurredAt: new Date(now.getTime() + 1000),
        source: "device_sensor",
      },
    });

    // Advance events again -> dose should STILL be DUE (not eligible)
    await advanceMedicationEvents(new Date(now.getTime() + 2000));
    event = await prisma.medicationEvent.findUnique({ where: { id: event.id } });
    assert.equal(event?.state, "DUE", "Dose must remain DUE after sensor-only detection");

    // 5. Caregiver records verified meal (REPORTED or CONFIRMED)
    assert.equal(mealUnlocksMedication("REPORTED"), true);
    await prisma.mealEvent.create({
      data: {
        patientId: patient.id,
        kind: "BREAKFAST",
        eventType: "REPORTED",
        occurredAt: new Date(now.getTime() + 5000),
        source: "caregiver",
      },
    });

    // Advance events -> dose becomes ELIGIBLE, and since device is online, transitions to NOTIFIED!
    await advanceMedicationEvents(new Date(now.getTime() + 6000));
    event = await prisma.medicationEvent.findUnique({ where: { id: event!.id } });
    assert.equal(event?.state, "NOTIFIED", "Dose should become NOTIFIED on dispenser");

    // 6. Dispense cycle runs on the hardware simulator
    await tickSimulator(device.id);

    // Verify event transitioned to CONFIRMED and DISPENSED
    event = await prisma.medicationEvent.findUnique({ where: { id: event!.id } });
    assert.equal(event?.state, "CONFIRMED", "Event should transition to CONFIRMED");
    assert.ok(event?.dispensedAt, "Dispensed timestamp should be recorded");
    assert.ok(event?.confirmedAt, "Confirmed timestamp should be recorded");

    // Verify slot inventory decremented from 10 to 9
    const updatedSlot = await prisma.deviceSlot.findFirst({
      where: { deviceId: device.id, slotIndex: 1 },
    });
    assert.equal(updatedSlot?.count, 9, "Device slot count should decrement by 1");

    // Verify dispensing event created
    const dispensingEvents = await prisma.dispensingEvent.findMany({
      where: { deviceId: device.id, medicationEventId: event!.id },
    });
    assert.equal(dispensingEvents.length, 1);
    assert.equal(dispensingEvents[0].result, "OK");
    assert.equal(dispensingEvents[0].sensorVerified, true);

    // 7. Verify adherence calculation
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    const adherence = await adherenceForPatient(patient.id, from, to);
    assert.equal(adherence.taken, 1, "Should count 1 taken dose");
    assert.equal(adherence.missed, 0, "Should count 0 missed doses");
    assert.equal(adherence.ratePct, 100, "Should be 100% adherence");
  });
});
