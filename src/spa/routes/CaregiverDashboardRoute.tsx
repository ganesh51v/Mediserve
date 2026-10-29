import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, useCaregiverDashboard, apiFetch, parseJsonSafely } from "../hooks";
import { Shell, Panel, StatusDot } from "../components/ui";
import { greetingFor } from "@/lib/constants";

export function CaregiverDashboardRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error, reload } = useCaregiverDashboard();

  // Patient adding form state
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [patientForm, setPatientForm] = useState({
    name: "",
    mrn: "",
    dateOfBirth: "1965-05-15",
    sex: "Undisclosed",
    emergencyName: "",
    emergencyPhone: "",
    notes: "Room 304 · Active station monitoring",
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8F6] text-xs font-mono uppercase tracking-widest text-[#68717A]">
        Verifying cryptographic session...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!patientForm.name.trim() || patientForm.name.trim().length < 2) {
      errors.name = "Patient legal name is required (minimum 2 characters).";
    }
    if (!patientForm.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required.";
    } else {
      const dob = new Date(patientForm.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        errors.dateOfBirth = "Date of birth must be a valid date in the past.";
      }
    }
    if (!patientForm.emergencyName.trim() || patientForm.emergencyName.trim().length < 2) {
      errors.emergencyName = "Emergency contact name is required.";
    }
    const digits = patientForm.emergencyPhone.replace(/\D/g, "");
    if (!patientForm.emergencyPhone.trim() || digits.length < 8 || digits.length > 15) {
      errors.emergencyPhone = "Valid contact phone with 8-15 digits is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/caregiver/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientForm),
      });
      const result = await parseJsonSafely(res);
      if (!res.ok) {
        throw new Error(result.error || "Failed to onboard patient.");
      }

      setSuccessBanner(
        `Patient ${result.patient?.name || patientForm.name} (MRN: ${result.patient?.mrn || "MS-NEW"}) successfully onboarded and assigned to your station!`
      );
      setShowAddPatientModal(false);
      // Reset form defaults
      setPatientForm({
        name: "",
        mrn: "",
        dateOfBirth: "1965-05-15",
        sex: "Undisclosed",
        emergencyName: "",
        emergencyPhone: "",
        notes: "Room 304 · Active station monitoring",
      });
      setFieldErrors({});
      // Refresh dashboard list
      reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to onboard patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell user={user} onLogout={logout}>
      {/* Editorial Clinical Header */}
      <section className="mb-6 sm:mb-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
            Clinical Workspace &middot; Caregiver Station
          </p>
        </div>
        <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold text-[#102A43] tracking-tight">
          {greetingFor()}, <span className="text-[#334E68]">{user.name.split(" ")[0]}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm text-[#627D98] leading-relaxed">
          Assigned patient monitoring for meal-aware medication dispensing. Adherence, clinical
          alerts, and dispenser hardware health are updated in real-time.
        </p>
      </section>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-6 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-4 text-xs font-semibold text-[#0D9488] shadow-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0D9488] text-white text-xs">
              ✓
            </span>
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-[#0D9488] hover:text-[#0B7A70] font-bold text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-xl">
          Synchronizing clinical telemetry...
        </div>
      )}

      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-xl">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Key Metrics Grid - Fluid 2 / 3 / 6 column */}
          <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Total Patients", data.totals.total, ""],
              ["Requires Attention", data.totals.attention, data.totals.attention > 0 ? "text-[#D97706]" : ""],
              ["Doses Scheduled Today", data.totals.eventsToday, ""],
              ["Missed Doses", data.totals.missedToday, data.totals.missedToday > 0 ? "text-[#DC2626]" : ""],
              ["Active Alerts", data.totals.activeAlerts, data.totals.activeAlerts > 0 ? "text-[#D97706]" : ""],
              ["Device Faults", data.totals.deviceProblems, data.totals.deviceProblems > 0 ? "text-[#DC2626]" : ""],
            ].map(([label, value, accentClass]) => (
              <div
                key={String(label)}
                className="group relative border border-[#D9E2EC] bg-[#FFFFFF] p-3.5 sm:p-4 rounded-xl shadow-[0_1px_3px_0_rgba(16,42,69,0.04)] transition-all duration-200 hover:border-[#0D9488]/40 hover:shadow-sm"
              >
                <div className={`font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#102A43] ${accentClass}`}>
                  {value}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-medium text-[#627D98] leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Assigned Patients Table / List with Action Bar */}
          <Panel
            title="Assigned Patient Directory"
            action={
              <div className="flex items-center gap-2">
                <Link
                  to="/caregiver/patient-editor"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#334E68] bg-[#F4F7FA] border border-[#D9E2EC] rounded-lg hover:bg-[#EDF2F7] hover:text-[#102A43] transition-colors"
                  title="Open Patient Details Editor"
                >
                  <svg className="w-3.5 h-3.5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Details</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0B7A70] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                >
                  <span className="text-sm font-extrabold leading-none">+</span>
                  <span>Add Patient</span>
                </button>
              </div>
            }
          >
            <div className="divide-y divide-[#D9E2EC]">
              {data.patients.map((row) => (
                <div
                  key={row.patient.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 sm:py-4 transition-all duration-150 hover:bg-[#F4F7FA] rounded-lg min-h-[56px] gap-2"
                >
                  <Link
                    to={`/caregiver/patients/${row.patient.id}`}
                    className="space-y-1 min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-sans text-base font-bold text-[#102A43] group-hover:text-[#0D9488] transition-colors">
                        {row.patient.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#627D98] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded">
                        MRN {row.patient.mrn}
                      </span>
                    </div>
                    <div className="text-xs text-[#627D98] flex flex-wrap items-center gap-2 sm:gap-3">
                      <StatusDot attention={row.attention} />
                      <span className="hidden sm:inline text-[#CBD5E1]">&middot;</span>
                      <span>DOB {new Date(row.patient.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  </Link>

                  <div className="mt-2 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EDF2F7]">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-[#102A43]">
                        Adherence:{" "}
                        <span className={row.adherence < 80 ? "text-[#D97706] font-bold" : "text-[#0D9488] font-bold"}>
                          {row.adherence}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#627D98]">
                        {row.alerts} open alert{row.alerts === 1 ? "" : "s"}
                      </div>
                    </div>

                    <Link
                      to={`/caregiver/patient-editor/${row.patient.id}`}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#334E68] bg-white border border-[#D9E2EC] rounded hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
                      title="Edit this patient's details"
                    >
                      Edit
                    </Link>

                    <Link
                      to={`/caregiver/patients/${row.patient.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F7FA] group-hover:bg-[#0D9488] text-[#627D98] group-hover:text-white transition-all duration-200 text-sm"
                      title="View Clinical Monitor"
                    >
                      &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ─── Patient Onboarding Modal Form ─── */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D9E2EC] max-w-lg w-full p-6 animate-scaleIn my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0D9488] text-white font-bold text-sm">
                  +
                </span>
                <div>
                  <h3 className="font-bold text-base text-[#102A43]">
                    Onboard New Clinical Patient
                  </h3>
                  <p className="text-[11px] text-[#627D98]">
                    Register patient record and assign directly to your station
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddPatientModal(false);
                  setSubmitError(null);
                  setFieldErrors({});
                }}
                className="text-[#9FB3C8] hover:text-[#102A43] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="mt-4 p-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-xs font-semibold text-[#DC2626]">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="mt-4 space-y-4">
              {/* Legal Name */}
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">
                  Patient Full Legal Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-[11px] text-[#DC2626]">{fieldErrors.name}</p>
                )}
              </div>

              {/* MRN & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">
                    Medical Record # (MRN)
                  </label>
                  <input
                    type="text"
                    value={patientForm.mrn}
                    onChange={(e) => setPatientForm({ ...patientForm, mrn: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">
                    Date of Birth <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                  />
                  {fieldErrors.dateOfBirth && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">{fieldErrors.dateOfBirth}</p>
                  )}
                </div>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">
                  Biological Sex
                </label>
                <select
                  value={patientForm.sex}
                  onChange={(e) => setPatientForm({ ...patientForm, sex: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none bg-white"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Undisclosed">Undisclosed</option>
                </select>
              </div>

              {/* Emergency Contact Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">
                    Emergency Contact Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.emergencyName}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyName: e.target.value })}
                    placeholder="e.g. Robert Vance (Son)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                  />
                  {fieldErrors.emergencyName && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">{fieldErrors.emergencyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">
                    Emergency Contact Phone <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={patientForm.emergencyPhone}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })}
                    placeholder="e.g. +1 (555) 234-5678"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                  />
                  {fieldErrors.emergencyPhone && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">{fieldErrors.emergencyPhone}</p>
                  )}
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">
                  Clinical Notes &amp; Unit Room
                </label>
                <textarea
                  rows={2}
                  value={patientForm.notes}
                  onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                  placeholder="e.g. Floor 3 · Sub-Acute Unit · Room 304"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9E2EC]">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#627D98] hover:text-[#102A43] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0B7A70] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span>Registering Patient…</span>
                  ) : (
                    <span>Register &amp; Assign Patient &rarr;</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
