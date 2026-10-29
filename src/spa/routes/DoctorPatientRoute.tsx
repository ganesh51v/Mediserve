import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth, usePatientProfile, usePlanActions, useNoteActions } from "../hooks";
import { Shell, Panel, PriorityMark } from "../components/ui";
import { ageFromDob, formatDate, formatTime, relationLabel } from "@/lib/constants";
import type { HealthMeasurement } from "../types";

export function DoctorPatientRoute() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error, reload } = usePatientProfile(id || "", "DOCTOR");
  const { createPlan, loading: planLoading } = usePlanActions();
  const { addNote, loading: noteLoading } = useNoteActions();

  // Plan form state
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [mealRelationship, setMealRelationship] = useState("NO_MEAL_DEPENDENCY");
  const [mealKind, setMealKind] = useState("");
  const [deviceSlot, setDeviceSlot] = useState(1);
  const [instructions, setInstructions] = useState("");

  // Clinical note state
  const [noteBody, setNoteBody] = useState("");

  if (authLoading) return <div className="p-8 text-center text-sm text-muted">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <Shell user={user} onLogout={logout}>
      <div className="p-8 text-center text-sm text-muted">Loading clinical monitoring...</div>
    </Shell>
  );

  if (error || !data || !data.patient) {
    return (
      <Shell user={user} onLogout={logout}>
        <p className="text-sm text-[#DC2626]">{error || "Patient not found."}</p>
      </Shell>
    );
  }

  const { patient, progress, week } = data;
  const latestByType = new Map<string, HealthMeasurement>();
  for (const m of patient.healthMeasurements || []) {
    if (!latestByType.has(m.type)) latestByType.set(m.type, m);
  }

  const handleAuthorizePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await createPlan({
      patientId: id,
      medicine,
      dosage,
      frequency,
      scheduledTime,
      startDate,
      endDate: endDate || null,
      mealRelationship,
      mealKind: mealKind || null,
      deviceSlot: Number(deviceSlot),
      instructions,
    });
    setMedicine("");
    setDosage("");
    setInstructions("");
    await reload();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteBody.trim()) return;
    await addNote(id, noteBody);
    setNoteBody("");
    await reload();
  };

  return (
    <Shell user={user} onLogout={logout}>
      <div className="border-b border-[#D9E2EC] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0D9488]" />
          Clinical Monitoring &middot; Patient Dossier
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#102A43]">
              {patient.name}
            </h1>
            <p className="mt-1 text-sm text-[#627D98]">
              Age {ageFromDob(patient.dateOfBirth)} &middot; Emergency contact: {patient.emergencyName}{" "}
              ({patient.emergencyPhone})
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 border border-[#D9E2EC] bg-[#FFFFFF] text-[#334E68] rounded-md">
            MRN {patient.mrn}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Panel title="Medication adherence">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#0D9488]">{week.ratePct}%</p>
          <p className="mt-1 text-xs text-[#627D98]">7-day recorded events</p>
        </Panel>
        <Panel title="Missed doses">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#DC2626]">{week.missed}</p>
          <p className="mt-1 text-xs text-[#627D98]">7-day window</p>
        </Panel>
        <Panel title="Delayed doses">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">{week.delayed}</p>
          <p className="mt-1 text-xs text-[#627D98]">Recorded offsets</p>
        </Panel>
        <Panel title="Medication events">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">{week.total}</p>
          <p className="mt-1 text-xs text-[#627D98]">Total schedule load</p>
        </Panel>
        <Panel title="Recent alerts">
          <p className="font-sans text-2xl sm:text-3xl font-bold text-[#102A43]">
            {(patient.alerts || []).filter((a) => !a.acknowledged).length}
          </p>
          <p className="mt-1 text-xs text-[#627D98]">Unacknowledged</p>
        </Panel>
      </div>

      <Panel title="Patient health" className="mt-6">
        <p className="mb-4 text-xs text-[#627D98]">
          Trends and recorded values only. A reading is not a diagnosis. Each tile reflects verified device source and clinical review status.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[...latestByType.values()].map((m) => (
            <div key={m.id} className="border border-[#D9E2EC] bg-[#FFFFFF] p-4 rounded-lg shadow-xs transition-colors hover:border-[#0D9488]/50">
              <div className="font-mono text-xs uppercase tracking-wider text-[#627D98]">{m.type}</div>
              <div className="mt-1 font-sans text-xl font-bold text-[#102A43]">
                {m.value} <span className="font-normal text-xs text-[#627D98]">{m.unit}</span>
              </div>
              <div className="mt-2 text-xs text-[#627D98] border-t border-[#D9E2EC] pt-2 leading-relaxed">
                <span className="font-mono">{formatTime(m.recordedAt)}</span> · {m.source}
                <div className="mt-1">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${
                    m.status === "REQUIRES_REVIEW"
                      ? "border-[#FCD34D] bg-[#FFFBEB] text-[#D97706]"
                      : "border-[#D9E2EC] bg-[#F4F7FA] text-[#334E68]"
                  }`}>
                    {m.status === "REQUIRES_REVIEW" ? "Requires review" : m.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {latestByType.size === 0 && (
            <p className="col-span-4 py-4 text-center text-xs text-[#627D98]">No recorded biometric measurements.</p>
          )}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Medication plans">
          <ul className="mb-6 divide-y divide-[#D9E2EC] text-sm">
            {(patient.medicationPlans || []).map((p) => (
              <li key={p.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#102A43]">{p.medication.name}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F4F7FA] border border-[#D9E2EC] text-[#334E68]">Slot {p.deviceSlot} · {p.scheduledTime}</span>
                </div>
                <div className="mt-1 text-xs text-[#627D98]">
                  {p.dosage} · {relationLabel(p.mealRelationship)} {p.mealKind ?? ""}
                  {p.instructions && <span> · {p.instructions}</span>}
                </div>
              </li>
            ))}
            {(patient.medicationPlans || []).length === 0 && (
              <li className="py-3 text-xs text-[#627D98]">No active medication regimens configured.</li>
            )}
          </ul>

          <div className="border-t border-[#D9E2EC] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] mb-3">Authorize New Regimen</h4>
            <form onSubmit={handleAuthorizePlan} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <input
                name="medicine"
                placeholder="Medicine name"
                required
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <input
                name="dosage"
                placeholder="Dosage (e.g. 500mg)"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <input
                name="frequency"
                placeholder="Frequency"
                required
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <input
                name="scheduledTime"
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <input
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <input
                name="endDate"
                type="date"
                placeholder="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <select
                value={mealRelationship}
                onChange={(e) => setMealRelationship(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              >
                <option value="NO_MEAL_DEPENDENCY">No meal dependency</option>
                <option value="BEFORE_MEAL">Before meal</option>
                <option value="WITH_MEAL">With meal</option>
                <option value="AFTER_MEAL">After meal</option>
                <option value="EMPTY_STOMACH">Empty stomach</option>
              </select>
              <select
                value={mealKind}
                onChange={(e) => setMealKind(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              >
                <option value="">Meal (if applicable)</option>
                <option value="BREAKFAST">Breakfast</option>
                <option value="LUNCH">Lunch</option>
                <option value="DINNER">Dinner</option>
              </select>
              <div className="min-h-[44px] flex items-center gap-2 border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 rounded-md">
                <span className="text-xs text-[#627D98] whitespace-nowrap">Slot</span>
                <input
                  name="deviceSlot"
                  type="number"
                  min={1}
                  max={4}
                  value={deviceSlot}
                  onChange={(e) => setDeviceSlot(Number(e.target.value))}
                  className="w-full bg-transparent text-xs text-[#102A43] focus:outline-none"
                />
              </div>
              <input
                name="instructions"
                placeholder="Instructions (as written, not inferred)"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3 py-2 text-xs text-[#102A43] rounded-md focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
              />
              <button
                type="submit"
                disabled={planLoading}
                className="col-span-1 sm:col-span-2 min-h-[44px] bg-[#0D9488] py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white rounded-md shadow-xs hover:bg-[#0B7A70] transition-colors focus:ring-2 focus:ring-[#0D9488]/30 focus:outline-none disabled:opacity-50 flex items-center justify-center"
              >
                {planLoading ? "Authorizing..." : "Authorize Regimen"}
              </button>
            </form>
          </div>
        </Panel>

        <Panel title="Medication history today">
          <p className="mb-4 text-xs text-[#627D98]">
            Adherence today: <span className="font-semibold text-[#0D9488]">{progress.ratePct}%</span> · {formatDate(new Date())}
          </p>
          <ul className="divide-y divide-[#D9E2EC] text-sm">
            {(patient.medicationEvents || []).map((e) => (
              <li key={e.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#102A43]">
                    {e.plan?.medication?.name || "Scheduled Medication"}
                  </div>
                  <div className="font-mono text-[11px] text-[#94A3B8]">{e.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs px-2 py-0.5 rounded bg-[#F4F7FA] border border-[#D9E2EC] text-[#334E68] inline-block">{e.state}</div>
                  <div className="text-xs text-[#627D98] mt-0.5">{formatTime(e.scheduledAt)}</div>
                </div>
              </li>
            ))}
            {(patient.medicationEvents || []).length === 0 && (
              <li className="py-4 text-center text-xs text-[#627D98]">No medication recorded today.</li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel title="Clinical instructions & notes" className="mt-6">
        <ul className="mb-6 divide-y divide-[#D9E2EC] text-sm">
          {(patient.clinicalNotes || []).map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-center gap-2 text-xs text-[#627D98]">
                <span className="font-semibold text-[#102A43]">{n.doctor.user.name}</span>
                <span>·</span>
                <span>{formatDate(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-[#334E68] leading-relaxed">{n.body}</p>
            </li>
          ))}
          {(patient.clinicalNotes || []).length === 0 && (
            <li className="py-3 text-xs text-[#627D98]">No clinical notes recorded for this patient.</li>
          )}
        </ul>
        <form onSubmit={handleAddNote} className="grid gap-2 border-t border-[#D9E2EC] pt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">Append Clinical Instruction</label>
          <textarea
            name="body"
            required
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Record clinical directives, observation updates, or dosage adjustments..."
            className="border border-[#D9E2EC] bg-[#FFFFFF] p-3 text-sm text-[#102A43] placeholder:text-[#94A3B8] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none rounded-md"
          />
          <button
            type="submit"
            disabled={noteLoading}
            className="w-fit min-h-[44px] bg-[#0D9488] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#0B7A70] transition-colors rounded-md focus:ring-2 focus:ring-[#0D9488]/30 focus:outline-none disabled:opacity-50 flex items-center justify-center"
          >
            {noteLoading ? "Recording..." : "Record Instruction"}
          </button>
        </form>
      </Panel>

      <Panel title="Clinical alerts" className="mt-6">
        <ul className="divide-y divide-[#D9E2EC] text-sm">
          {(patient.alerts || []).map((a) => (
            <li key={a.id} className="py-3">
              <div className="flex items-center gap-2">
                <PriorityMark priority={a.priority} />
                <span className="font-semibold text-[#102A43] text-sm">{a.title}</span>
              </div>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-[#334E68] leading-relaxed">{a.body}</pre>
            </li>
          ))}
          {(patient.alerts || []).length === 0 && (
            <li className="py-2 text-xs text-[#627D98]">No active clinical alerts for this patient.</li>
          )}
        </ul>
      </Panel>
    </Shell>
  );
}
