import React, { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Shell, Panel } from "../components/ui";
import { useCaregiverPatientEditor } from "../hooks/useCaregiverPatientEditor";

/**
 * CaregiverPatientEditorRoute
 *
 * Dedicated Patient Details Form Editor in the caregiver area.
 * Allows an authorized caregiver to select an assigned patient, inspect their current
 * demographic and emergency details, validate inputs, and save changes.
 */
export function CaregiverPatientEditorRoute() {
  const { id } = useParams<{ id: string }>();
  const {
    user,
    assignedPatients,
    selectedPatientId,
    setSelectedPatientId,
    formData,
    isDirty,
    loading,
    isSubmitting,
    saveSuccess,
    saveError,
    fieldErrors,
    updateField,
    save,
    resetForm,
    logout,
  } = useCaregiverPatientEditor(id);

  const [confirmSwitchId, setConfirmSwitchId] = useState<string | null>(null);

  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save();
  };

  const handlePatientSelectChange = (newPatientId: string) => {
    if (isDirty) {
      setConfirmSwitchId(newPatientId);
    } else {
      setSelectedPatientId(newPatientId);
    }
  };

  return (
    <Shell user={user} onLogout={logout}>
      {/* Editorial Clinical Header */}
      <section className="mb-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
                Caregiver Station &middot; Patient Record Administration
              </p>
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold text-[#102A43] tracking-tight">
              Patient <span className="text-[#334E68]">Details Editor</span>
            </h1>
            <p className="mt-1 text-sm text-[#627D98] leading-relaxed">
              Maintain accurate patient demographics, verified emergency contacts, and vital clinical notes.
            </p>
          </div>

          {/* Navigation Links Back to Patient Monitor */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/caregiver"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-semibold text-[#334E68] bg-[#FFFFFF] border border-[#D9E2EC] rounded-md hover:bg-[#F4F7FA] transition-colors"
            >
              <span>&larr;</span>
              <span>Back to Station</span>
            </Link>
            {selectedPatientId && (
              <Link
                to={`/caregiver/patients/${selectedPatientId}`}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-semibold text-[#0D9488] bg-[#F0FDFA] border border-[#99F6E4] rounded-md hover:bg-[#CCFBF1] transition-colors shadow-2xs"
              >
                <span>View Patient Dashboard &rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Global Success / Failure Feedback Banners */}
      {saveSuccess && (
        <div
          className="mb-6 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] p-4 text-xs font-semibold text-[#0D9488] shadow-2xs flex items-center justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span>Patient details updated successfully! All records have been persisted.</span>
          </div>
        </div>
      )}

      {saveError && (
        <div
          className="mb-6 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-semibold text-[#DC2626] shadow-2xs flex items-center justify-between"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚠</span>
            <span>{saveError} (Any unsaved edits remain preserved below)</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 max-w-5xl">
        {/* Left Column: Patient Switcher & Assignment Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Panel title="Select Assigned Patient">
            <label htmlFor="assigned-patient-select" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1.5">
              Assigned Patient Directory
            </label>
            <select
              id="assigned-patient-select"
              value={selectedPatientId}
              onChange={(e) => handlePatientSelectChange(e.target.value)}
              disabled={loading || assignedPatients.length === 0}
              className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all disabled:bg-[#F4F7FA] disabled:text-[#9FB3C8]"
            >
              {assignedPatients.length === 0 ? (
                <option value="">No assigned patients found</option>
              ) : (
                assignedPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))
              )}
            </select>

            <p className="mt-2 text-xs text-[#627D98] leading-relaxed">
              Caregiver editing permissions are restricted to patients actively linked to your care team.
            </p>

            {/* Selected Patient Identity Badge */}
            {formData.mrn && (
              <div className="mt-5 border-t border-[#D9E2EC] pt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#627D98] font-medium">Record Identifier:</span>
                  <span className="font-mono text-[11px] font-bold text-[#102A43] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded">
                    {formData.mrn}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#627D98] font-medium">Patient Status:</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0D9488]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
                    Active Care Profile
                  </span>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Right Column: Editable Patient Form */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-xl shadow-2xs">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0D9488] animate-pulse" />
                Loading patient stored details...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Panel title="Patient Information & Emergency Contacts">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patient Full Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="patient-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Full Legal Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="patient-name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? "error-patient-name" : undefined}
                      placeholder="e.g. John Doe"
                      className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                        fieldErrors.name ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                      }`}
                    />
                    {fieldErrors.name && (
                      <p id="error-patient-name" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Medical Record Number (Read Only) */}
                  <div>
                    <label htmlFor="patient-mrn" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Medical Record Number (MRN)
                    </label>
                    <input
                      id="patient-mrn"
                      name="mrn"
                      type="text"
                      readOnly
                      value={formData.mrn}
                      className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#F4F7FA] rounded-md px-3 py-2 text-sm font-mono text-[#627D98] cursor-not-allowed"
                    />
                    <span className="text-[10px] text-[#9FB3C8] mt-0.5 block">Unique system identifier (immutable)</span>
                  </div>

                  {/* Biological Sex */}
                  <div>
                    <label htmlFor="patient-sex" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Biological / Clinical Sex
                    </label>
                    <select
                      id="patient-sex"
                      name="sex"
                      value={formData.sex}
                      onChange={(e) => updateField("sex", e.target.value)}
                      className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="Other">Other</option>
                      <option value="Undisclosed">Undisclosed</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="sm:col-span-2">
                    <label htmlFor="patient-dob" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Date of Birth <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="patient-dob"
                      name="dateOfBirth"
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => updateField("dateOfBirth", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                      aria-describedby={fieldErrors.dateOfBirth ? "error-patient-dob" : undefined}
                      className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all ${
                        fieldErrors.dateOfBirth ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                      }`}
                    />
                    {fieldErrors.dateOfBirth && (
                      <p id="error-patient-dob" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                        {fieldErrors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  {/* Emergency Contact Name */}
                  <div>
                    <label htmlFor="patient-emergency-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Emergency Contact Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="patient-emergency-name"
                      name="emergencyName"
                      type="text"
                      required
                      value={formData.emergencyName}
                      onChange={(e) => updateField("emergencyName", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.emergencyName)}
                      aria-describedby={fieldErrors.emergencyName ? "error-patient-emergency-name" : undefined}
                      placeholder="e.g. Mary Doe (Daughter)"
                      className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                        fieldErrors.emergencyName ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                      }`}
                    />
                    {fieldErrors.emergencyName && (
                      <p id="error-patient-emergency-name" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                        {fieldErrors.emergencyName}
                      </p>
                    )}
                  </div>

                  {/* Emergency Contact Phone */}
                  <div>
                    <label htmlFor="patient-emergency-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Emergency Phone Number <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="patient-emergency-phone"
                      name="emergencyPhone"
                      type="tel"
                      required
                      value={formData.emergencyPhone}
                      onChange={(e) => updateField("emergencyPhone", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.emergencyPhone)}
                      aria-describedby={fieldErrors.emergencyPhone ? "error-patient-emergency-phone" : undefined}
                      placeholder="+1-555-0101"
                      className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                        fieldErrors.emergencyPhone ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                      }`}
                    />
                    {fieldErrors.emergencyPhone && (
                      <p id="error-patient-emergency-phone" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                        {fieldErrors.emergencyPhone}
                      </p>
                    )}
                  </div>

                  {/* Clinical Notes & Allergies */}
                  <div className="sm:col-span-2">
                    <label htmlFor="patient-notes" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Clinical Conditions &amp; Care Notes
                    </label>
                    <textarea
                      id="patient-notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="e.g. Type 2 Diabetes, Penicillin Allergy, Mobility Assistance"
                      className="w-full border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                    />
                    {fieldErrors.notes && (
                      <p className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                        {fieldErrors.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Actions Footer */}
                <div className="mt-6 border-t border-[#D9E2EC] pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={!isDirty || isSubmitting}
                    onClick={() => resetForm()}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#627D98] hover:text-[#102A43] bg-[#FFFFFF] border border-[#D9E2EC] rounded-md hover:bg-[#F4F7FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    Discard Changes
                  </button>

                  <button
                    type="submit"
                    disabled={!isDirty || isSubmitting}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Saving Patient Records...
                      </span>
                    ) : (
                      "Save Patient Details"
                    )}
                  </button>
                </div>
              </Panel>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal when switching patients with unsaved changes */}
      {confirmSwitchId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#D9E2EC] rounded-xl p-6 shadow-xl text-left">
            <h3 className="text-base font-bold text-[#102A43]">
              Unsaved Patient Modifications
            </h3>
            <p className="mt-2 text-xs text-[#627D98] leading-relaxed">
              You have made modifications to this patient's details that have not been saved.
              Switching patients will discard your current edits.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmSwitchId(null)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#334E68] bg-[#F4F7FA] border border-[#D9E2EC] rounded-md hover:bg-[#EDF2F7] transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientId(confirmSwitchId);
                  setConfirmSwitchId(null);
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-md transition-colors"
              >
                Discard &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default CaregiverPatientEditorRoute;
