import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth, usePatientProfile, useMealActions, useAlerts, useDevicePairing } from "../hooks";
import { Shell, Panel, StatusDot, PriorityMark } from "../components/ui";
import { ageFromDob, formatTime, mealLabel, relationLabel } from "@/lib/constants";

export function CaregiverPatientRoute() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error, reload } = usePatientProfile(id || "", "CAREGIVER");
  const { recordMeal, loading: mealLoading } = useMealActions();
  const { acknowledge } = useAlerts();
  const { pairDevice, unpairDevice, loading: pairingLoading } = useDevicePairing();

  const [mealKind, setMealKind] = useState("BREAKFAST");
  const [mealEventType, setMealEventType] = useState("REPORTED");

  // Hardware device pairing state
  const [showPairModal, setShowPairModal] = useState(false);
  const [deviceSerialInput, setDeviceSerialInput] = useState("");
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingSuccess, setPairingSuccess] = useState<string | null>(null);

  if (authLoading) return <div className="p-8 text-center text-sm text-muted">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <Shell user={user} onLogout={logout}>
      <div className="p-8 text-center text-sm text-muted">Loading patient profile...</div>
    </Shell>
  );

  if (error || !data || !data.patient) {
    return (
      <Shell user={user} onLogout={logout}>
        <p className="text-sm text-[#DC2626]">{error || "Patient not found."}</p>
      </Shell>
    );
  }

  const { patient, progress } = data;
  const assignment = patient.assignments?.[0];
  const device = patient.devices?.[0];
  const mealEvents = patient.mealEvents || [];

  const meals = ["BREAKFAST", "LUNCH", "DINNER"].map((kind) => {
    const events = mealEvents.filter((m) => m.kind === kind);
    const verified = events.some((e) => e.eventType === "CONFIRMED" || e.eventType === "REPORTED");
    const sensor = events.some((e) => e.eventType === "SENSOR_DETECTED");
    return { kind, verified, sensor, events };
  });
  const mealsDone = meals.filter((m) => m.verified).length;

  const handleRecordMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await recordMeal({
      patientId: id,
      kind: mealKind,
      eventType: mealEventType,
      source: "caregiver",
    });
    await reload();
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledge(alertId);
    await reload();
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !deviceSerialInput.trim()) return;
    try {
      setPairingError(null);
      await pairDevice(id, deviceSerialInput.trim());
      setPairingSuccess(`Successfully linked hardware dispenser ${deviceSerialInput.trim()}`);
      setDeviceSerialInput("");
      setShowPairModal(false);
      await reload();
      setTimeout(() => setPairingSuccess(null), 4000);
    } catch (err) {
      setPairingError(err instanceof Error ? err.message : "Failed to link device");
    }
  };

  const handleUnpairDevice = async () => {
    if (!id || !confirm("Are you sure you want to unpair this hardware dispenser?")) return;
    try {
      await unpairDevice(id);
      await reload();
    } catch {
      alert("Failed to unpair device");
    }
  };

  return (
    <Shell user={user} onLogout={logout}>
      <div className="border-b border-[#D9E2EC] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0D9488]" />
          Caregiver Telemetry &middot; Patient Record
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#102A43]">
              {patient.name}
            </h1>
            <p className="mt-1 text-sm text-[#627D98]">
              Age {ageFromDob(patient.dateOfBirth)} &middot; Assigned doctor {assignment?.doctor?.user.name ?? "—"} &middot; Assigned caregiver {assignment?.caregiver?.user.name ?? "—"}
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 border border-[#D9E2EC] bg-[#FFFFFF] text-[#334E68] rounded-md">
            MRN {patient.mrn}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Panel title="Today's status">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">
            {progress.completed} <span className="font-normal text-sm text-[#627D98]">/ {progress.total || 0}</span>
          </p>
          <p className="mt-1 text-xs text-[#627D98]">Medication completed</p>
        </Panel>
        <Panel title="Adherence">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#0D9488]">{progress.ratePct}%</p>
          <p className="mt-1 text-xs text-[#627D98]">Today · recorded events</p>
        </Panel>
        <Panel title="Meals">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">
            {mealsDone} <span className="font-normal text-sm text-[#627D98]">/ 3</span>
          </p>
          <p className="mt-1 text-xs text-[#627D98]">Verified meals</p>
        </Panel>
        <Panel title="Device">
          <div className="flex items-center justify-between mt-1">
            <StatusDot attention={!device || !device.online} />
            <button
              onClick={() => setShowPairModal(true)}
              className="min-h-[44px] inline-flex items-center text-[11px] font-semibold text-[#0D9488] hover:underline cursor-pointer"
            >
              {device ? "Change" : "+ Link"}
            </button>
          </div>
          <p className="mt-1 font-mono text-xs text-[#627D98]">{device ? device.serial : "No device paired"}</p>
        </Panel>
        <Panel title="Alerts">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">
            {(patient.alerts || []).filter((a) => !a.acknowledged).length}
          </p>
          <p className="mt-1 text-xs text-[#627D98]">Unacknowledged</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Today's meals">
          <ul className="divide-y divide-[#D9E2EC] text-sm">
            {meals.map((m) => (
              <li key={m.kind} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-[#102A43]">{mealLabel(m.kind)}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  m.verified
                    ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0D9488]"
                    : m.sensor
                    ? "border-[#FCD34D] bg-[#FFFBEB] text-[#D97706]"
                    : "border-[#D9E2EC] bg-[#F4F7FA] text-[#627D98]"
                }`}>
                  {m.verified ? "Verified" : m.sensor ? "Sensor only (unverified)" : "Not recorded"}
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleRecordMeal} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <select
              value={mealKind}
              onChange={(e) => setMealKind(e.target.value)}
              className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
            </select>
            <select
              value={mealEventType}
              onChange={(e) => setMealEventType(e.target.value)}
              className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
            >
              <option value="REPORTED">Reported</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="SENSOR_DETECTED">Sensor-detected</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
            <button
              type="submit"
              disabled={mealLoading}
              className="min-h-[44px] bg-[#0D9488] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-md hover:bg-[#0B7A70] transition-colors focus:ring-2 focus:ring-[#0D9488]/30 focus:outline-none disabled:opacity-50"
            >
              {mealLoading ? "Recording..." : "Record Meal"}
            </button>
          </form>
          <p className="mt-3 text-xs text-[#627D98] leading-relaxed">
            Scheduled, reported, sensor-detected, and confirmed are distinct. Sensor-detected
            events do not unlock after-meal medication.
          </p>
        </Panel>

        <Panel title="Medication today">
          <ul className="divide-y divide-[#D9E2EC] text-sm">
            {(patient.medicationEvents || []).map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#102A43]">
                    {e.plan?.medication?.name || "Scheduled Medication"}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F4F7FA] border border-[#D9E2EC] text-[#334E68]">{e.state}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#627D98]">
                  <span>{formatTime(e.scheduledAt)}</span>
                  <span>&middot;</span>
                  <span>{e.plan?.mealRelationship ? relationLabel(e.plan.mealRelationship) : "Standard"}</span>
                  <span>&middot;</span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">{e.id}</span>
                </div>
              </li>
            ))}
            {(patient.medicationEvents || []).length === 0 && (
              <li className="py-4 text-center text-xs text-[#627D98]">No medication scheduled for today.</li>
            )}
          </ul>
        </Panel>
      </div>

      {/* Hardware Dispenser Panel */}
      <Panel title="Hardware Dispenser Unit" className="mt-6">
        {pairingSuccess && (
          <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs font-semibold text-[#0D9488]">
            ✓ {pairingSuccess}
          </div>
        )}

        {device ? (
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-[#D9E2EC] pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${device.online ? "bg-[#0D9488] animate-pulse" : "bg-[#DC2626]"}`} />
                <span className="font-mono text-sm font-bold text-[#102A43]">{device.serial}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#627D98] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded">
                  v{device.firmware}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowPairModal(true)}
                  className="min-h-[44px] inline-flex items-center text-xs font-semibold text-[#0D9488] hover:underline"
                >
                  Change Device Serial
                </button>
                <span className="text-[#CBD5E1]">|</span>
                <button
                  onClick={handleUnpairDevice}
                  className="min-h-[44px] inline-flex items-center text-xs font-semibold text-[#DC2626] hover:underline"
                >
                  Unpair Unit
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 text-sm">
              <dl className="grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Online Status</dt>
                <dd className="font-semibold text-[#102A43]">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                    device.online ? "bg-[#F0FDFA] text-[#0D9488] border border-[#99F6E4]" : "bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]"
                  }`}>
                    {device.online ? "Online" : "Offline"}
                  </span>
                </dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Battery Level</dt>
                <dd className="font-mono text-[#102A43] font-semibold">{device.batteryPct}%</dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Wi-Fi Quality</dt>
                <dd className="text-[#102A43]">{device.wifiQuality}</dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Door Mechanism</dt>
                <dd className="text-[#102A43]">{device.door}</dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Stepper Motor</dt>
                <dd className="text-[#102A43]">{device.motor}</dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">Sensors</dt>
                <dd className="text-[#102A43]">{device.sensors}</dd>
                <dt className="text-[#627D98] font-medium uppercase tracking-wider text-[11px]">SIM State</dt>
                <dd className="font-mono text-[#102A43] uppercase text-[10px]">{device.simState}</dd>
              </dl>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#627D98]">Medication Stock Slots</p>
                <div className="divide-y divide-[#D9E2EC] border border-[#EDF2F7] rounded-lg bg-[#F8FAFC] p-3">
                  {(device.slots || [])
                    .slice()
                    .sort((a, b) => a.slotIndex - b.slotIndex)
                    .map((s) => (
                      <div key={s.id} className="flex justify-between py-1.5 text-xs">
                        <span className="font-mono text-[#334E68] font-semibold">Slot {s.slotIndex}</span>
                        <span className="font-medium text-[#102A43]">
                          {s.stock.charAt(0) + s.stock.slice(1).toLowerCase()} ({s.count} doses)
                        </span>
                      </div>
                    ))}
                  {(!device.slots || device.slots.length === 0) && (
                    <div className="py-2 text-xs text-[#627D98] text-center font-mono">
                      Carousels ready for slot assignment
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-dashed border-[#CBD5E1] bg-[#F8FAFC] rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
                <span className="text-sm font-semibold text-[#102A43]">No Physical Dispenser Linked</span>
              </div>
              <p className="mt-1 text-xs text-[#627D98] max-w-xl leading-relaxed">
                Link an ESP32 hardware carousel or simulated unit to this patient by entering the device serial printed on the device chassis.
              </p>
            </div>
            <button
              onClick={() => setShowPairModal(true)}
              className="flex-shrink-0 min-h-[44px] bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors shadow-sm flex items-center justify-center"
            >
              + Pair Hardware Dispenser
            </button>
          </div>
        )}
      </Panel>

      {/* Device Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#D9E2EC] bg-[#FFFFFF] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#0D9488] font-bold">
                  Hardware Configuration
                </div>
                <h3 className="font-sans text-lg font-bold text-[#102A43]">
                  Pair Physical Dispenser
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPairModal(false);
                  setPairingError(null);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#94A3B8] hover:text-[#102A43] text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <p className="mt-2 text-xs text-[#627D98] leading-relaxed">
              Enter the Device Serial number configured on your physical ESP32 device firmware or printed on the chassis label (e.g. <span className="font-mono font-semibold text-[#102A43]">MS-DISP-A1</span>).
            </p>

            {pairingError && (
              <div className="mt-3 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-2.5 text-xs text-[#DC2626]">
                {pairingError}
              </div>
            )}

            <form onSubmit={handlePairDevice} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                  Device Serial Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MS-DISP-A1 or ESP32-MAC"
                  value={deviceSerialInput}
                  onChange={(e) => setDeviceSerialInput(e.target.value)}
                  className="w-full min-h-[44px] rounded-md border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none placeholder:text-[#9FB3C8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPairModal(false);
                    setPairingError(null);
                  }}
                  className="min-h-[44px] flex items-center justify-center rounded-md border border-[#D9E2EC] px-4 py-2 text-xs font-semibold text-[#627D98] hover:bg-[#F4F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="min-h-[44px] flex items-center justify-center rounded-md bg-[#0D9488] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#0F766E] disabled:opacity-50"
                >
                  {pairingLoading ? "Pairing..." : "Link Hardware Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Patient health timeline">
          <ol className="space-y-4">
            {(patient.timelineEvents || []).map((t) => (
              <li key={t.id} className="grid grid-cols-[88px_1fr] gap-4 text-xs">
                <span className="font-mono text-[#627D98]">{formatTime(t.occurredAt)}</span>
                <div>
                  <div className="font-semibold text-[#102A43]">{t.title}</div>
                  <div className="mt-0.5 text-[#627D98]">{t.detail}</div>
                </div>
              </li>
            ))}
            {(patient.timelineEvents || []).length === 0 && (
              <li className="py-2 text-xs text-[#627D98]">No recorded timeline events.</li>
            )}
          </ol>
        </Panel>
        <Panel title="Alerts">
          <ul className="divide-y divide-[#D9E2EC]">
            {(patient.alerts || []).map((a) => (
              <li key={a.id} className="py-3 text-xs">
                <div className="flex items-center justify-between">
                  <PriorityMark priority={a.priority} />
                  {a.acknowledged ? (
                    <span className="font-mono text-[11px] text-[#94A3B8]">Acknowledged</span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="min-h-[44px] inline-flex items-center text-[#0D9488] font-semibold hover:underline text-xs"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
                <div className="mt-1.5 font-semibold text-[#102A43] text-sm">{a.title}</div>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-[#334E68]">{a.body}</pre>
              </li>
            ))}
            {(patient.alerts || []).length === 0 && (
              <li className="py-2 text-xs text-[#627D98]">No active alerts for this patient.</li>
            )}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}
