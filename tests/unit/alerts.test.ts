import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { raiseAlert, evaluateAlerts } from "../../src/lib/engines/alerts";
import { prisma } from "../../src/lib/db";

describe("alerts engine", () => {
  test("raiseAlert deduplicates within 6-hour window for unacknowledged alert", async () => {
    const patientId = "patient-alert-dedup-test";

    // 1. Raise alert
    const alert1 = await raiseAlert({
      patientId,
      category: "DEVICE",
      priority: "WARNING",
      title: "Door opened",
      body: "Dispenser door was opened unexpectedly",
    });

    assert.ok(alert1.id);
    assert.equal(alert1.acknowledged, false);

    // 2. Raise same alert within 6 hours -> must return the exact same alert
    const alert2 = await raiseAlert({
      patientId,
      category: "DEVICE",
      priority: "WARNING",
      title: "Door opened",
      body: "Dispenser door was opened unexpectedly again",
    });

    assert.equal(alert1.id, alert2.id);

    // 3. Acknowledge alert1
    await prisma.alert.update({
      where: { id: alert1.id },
      data: { acknowledged: true },
    });

    // 4. Raise again -> since previous is acknowledged, new alert is created
    const alert3 = await raiseAlert({
      patientId,
      category: "DEVICE",
      priority: "WARNING",
      title: "Door opened",
      body: "Dispenser door opened after acknowledgement",
    });

    assert.notEqual(alert1.id, alert3.id);
  });

  test("raiseAlert creates PUSH and EMAIL notifications for assigned care team", async () => {
    const patientId = "patient-notif-team";
    const doctorUserId = "user-doc-test";
    const caregiverUserId = "user-cg-test";

    // Setup doctor and caregiver
    const doc = await prisma.doctor.create({
      data: { userId: doctorUserId, specialty: "Geriatrics" },
    });
    const cg = await prisma.caregiver.create({
      data: { userId: caregiverUserId, phone: "555-0199" },
    });

    await prisma.patientAssignment.create({
      data: {
        patientId,
        doctorId: doc.id,
        caregiverId: cg.id,
        active: true,
      },
    });

    await raiseAlert({
      patientId,
      category: "MEDICATION",
      priority: "URGENT",
      title: "Dispensing failure",
      body: "Dispenser jam detected during morning dose",
    });

    const notifsDoc = await prisma.notification.findMany({ where: { userId: doctorUserId } });
    const notifsCg = await prisma.notification.findMany({ where: { userId: caregiverUserId } });

    assert.ok(notifsDoc.some((n) => n.channel === "PUSH" && n.title === "Dispensing failure"));
    assert.ok(notifsDoc.some((n) => n.channel === "EMAIL" && n.title === "Dispensing failure"));
    assert.ok(notifsCg.some((n) => n.channel === "PUSH" && n.title === "Dispensing failure"));
    assert.ok(notifsCg.some((n) => n.channel === "EMAIL" && n.title === "Dispensing failure"));
  });

  test("evaluateAlerts generates alerts for device issues (offline, jammed, low battery)", async () => {
    const patientId = "patient-eval-device-alerts";
    const device = await prisma.device.create({
      data: {
        serial: "MED-EVAL-ALERT-01",
        patientId,
        online: false,
        simState: "OFFLINE",
        batteryPct: 15,
        slots: {
          create: [{ slotIndex: 1, stock: "EMPTY", count: 0 }],
        },
      },
    });

    await evaluateAlerts();

    const alerts = await prisma.alert.findMany({ where: { patientId } });
    assert.ok(alerts.some((a) => a.title === "Device offline" && a.priority === "URGENT"));
    assert.ok(alerts.some((a) => a.title === "Low battery" && a.priority === "WARNING"));
    assert.ok(alerts.some((a) => a.title === "Low medication" && a.priority === "URGENT"));
  });
});
