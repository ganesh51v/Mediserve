import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Shell, Panel } from "../components/ui";
import { useUserProfile } from "../hooks/useUserProfile";

/**
 * ProfileRoute Component
 *
 * Dedicated User Profile Editor enabling authenticated users to view and update
 * their own account credentials and clinical profile attributes.
 *
 * Requirements fulfilled:
 * - Pre-filled editable form with all existing user model & role attributes
 * - Client-side responsive validation with inline field errors
 * - Server-side authoritative validation and email uniqueness checks
 * - Storage placeholder for institutional avatar photo (HIPAA credentialing compliant)
 * - Error resilience: preserves user input intact when save fails
 * - Strict authorization: only user's own profile can be modified
 * - Unsaved changes protection: beforeunload browser warning + in-app discard modal
 * - WCAG accessibility: aria-describedby, aria-invalid, aria-live, 44px touch targets
 * - Responsive mobile & desktop layout following MediServe clinical theme
 */
export function ProfileRoute() {
  const {
    profile,
    formData,
    isDirty,
    loading,
    isSubmitting,
    saveSuccess,
    saveError,
    fieldErrors,
    updateField,
    saveProfile,
    resetForm,
    logout,
  } = useUserProfile();

  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  // 1. Browser navigation guard: warn user before leaving tab or refreshing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to discard your edits?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile();
  };

  // Compute User Initials for Avatar Badge
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "US";

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm font-medium text-[#627D98]">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0D9488] animate-ping" />
          <span>Loading user profile records...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated guard
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const isDoctor = profile.role === "DOCTOR";
  const isCaregiver = profile.role === "CAREGIVER";

  return (
    <Shell
      user={{
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        verificationStatus: profile.verificationStatus,
        isVerified: profile.isVerified,
      }}
      onLogout={logout}
    >
      {/* Page Header */}
      <section className="mb-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
                Account Governance &middot; User Credentials
              </p>
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
              User <span className="text-[#334E68]">Profile</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#627D98] leading-relaxed">
              Manage your verified clinical identity, professional registration records, and secure
              communication channels.
            </p>
          </div>

          {/* Unsaved Changes Status Badge */}
          {isDirty && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FCD34D] bg-[#FFFBEB] text-[#D97706] text-xs font-semibold shadow-2xs animate-pulse"
              role="status"
              aria-live="polite"
            >
              <span className="h-2 w-2 rounded-full bg-[#D97706]" />
              <span>Unsaved Changes</span>
            </div>
          )}
        </div>
      </section>

      {/* Global Notifications */}
      {saveSuccess && (
        <div
          className="mb-6 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] p-4 text-xs font-semibold text-[#0D9488] shadow-2xs flex items-center justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span>Profile updated successfully! All changes have been securely persisted.</span>
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
            <span>{saveError} (Your typed changes are preserved below)</span>
          </div>
        </div>
      )}

      {/* Main Profile Editor Grid */}
      <div className="grid gap-6 lg:grid-cols-3 max-w-5xl">
        {/* Left Column: Clinical Identity & Avatar Card */}
        <div className="lg:col-span-1 space-y-6">
          <Panel title="Clinical Identity Card">
            <div className="flex flex-col items-center text-center py-2">
              {/* Dynamic Initials Avatar */}
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#102A43] to-[#334E68] text-white shadow-md border-2 border-white"
                aria-label={`Profile avatar for ${profile.name}`}
              >
                <span className="font-sans text-3xl font-extrabold tracking-wider">{initials}</span>
                <span
                  className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${
                    profile.isVerified ? "bg-[#0D9488]" : "bg-[#D97706]"
                  }`}
                  title={profile.isVerified ? "Credentials Verified" : "Verification Pending"}
                />
              </div>

              <h2 className="mt-4 font-sans text-lg font-bold text-[#102A43] truncate max-w-full">
                {formData.name || profile.name}
              </h2>
              <p className="text-xs text-[#627D98] font-mono mt-0.5 truncate max-w-full">
                {formData.email || profile.email}
              </p>

              {/* Role & Verification Badges */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0D9488] bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-1 rounded-md">
                  {profile.role}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                    profile.isVerified
                      ? "text-[#0D9488] bg-[#F0FDFA] border-[#99F6E4]"
                      : "text-[#D97706] bg-[#FFFBEB] border-[#FCD34D]"
                  }`}
                >
                  {profile.verificationStatus}
                </span>
              </div>
            </div>

            {/* Avatar Storage Placeholder Notice */}
            <div className="mt-6 border-t border-[#D9E2EC] pt-4">
              <div className="rounded-md border border-[#EDF2F7] bg-[#F4F7FA] p-3 text-left">
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#627D98] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-[11px] text-[#627D98] leading-relaxed">
                    <strong className="text-[#334E68] block mb-0.5">Institutional ID Photograph</strong>
                    Biometric photos and badge images are issued centrally by hospital credentialing
                    services. Local file uploads are disabled to preserve medical directory integrity.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="mt-4 space-y-2 text-xs text-[#627D98]">
              <div className="flex justify-between py-1 border-b border-[#D9E2EC]/50">
                <span className="text-[#334E68] font-medium">User Identifier:</span>
                <span className="font-mono text-[11px] truncate max-w-[140px]">{profile.id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#334E68] font-medium">Member Since:</span>
                <span className="font-mono text-[11px]">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Columns: Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} noValidate>
            <Panel title="Personal & Contact Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Legal Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="profile-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Full Legal Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? "error-profile-name" : undefined}
                    placeholder="e.g. Dr. Jane Doe"
                    className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                      fieldErrors.name ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="error-profile-name" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="profile-email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Email Address <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "error-profile-email" : undefined}
                    placeholder="clinician@hospital.org"
                    className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                      fieldErrors.email ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="error-profile-email" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label htmlFor="profile-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "error-profile-phone" : undefined}
                    placeholder="+1-555-0199"
                    className={`w-full min-h-[44px] border rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8] ${
                      fieldErrors.phone ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#D9E2EC] bg-[#FFFFFF]"
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p id="error-profile-phone" className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            {/* Doctor-Specific Professional Credentials Panel */}
            {isDoctor && (
              <div className="mt-6">
                <Panel title="Medical Credentials & Clinical Practice">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="profile-specialty" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Medical Specialty
                      </label>
                      <input
                        id="profile-specialty"
                        name="specialty"
                        type="text"
                        value={formData.specialty || ""}
                        onChange={(e) => updateField("specialty", e.target.value)}
                        placeholder="e.g. Internal Medicine, Cardiology"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-hospital" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Hospital / Practice Affiliation
                      </label>
                      <input
                        id="profile-hospital"
                        name="hospitalAffiliation"
                        type="text"
                        value={formData.hospitalAffiliation || ""}
                        onChange={(e) => updateField("hospitalAffiliation", e.target.value)}
                        placeholder="e.g. Memorial General Hospital"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-license" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Medical License Number
                      </label>
                      <input
                        id="profile-license"
                        name="licenseNumber"
                        type="text"
                        value={formData.licenseNumber || ""}
                        onChange={(e) => updateField("licenseNumber", e.target.value)}
                        placeholder="e.g. MED-CA-99210"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-years-doc" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Years of Practice
                      </label>
                      <input
                        id="profile-years-doc"
                        name="yearsOfPractice"
                        type="number"
                        min="0"
                        max="75"
                        value={formData.yearsOfPractice || ""}
                        onChange={(e) => updateField("yearsOfPractice", e.target.value)}
                        placeholder="14"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                      {fieldErrors.yearsOfPractice && (
                        <p className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                          {fieldErrors.yearsOfPractice}
                        </p>
                      )}
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {/* Caregiver-Specific Credentials Panel */}
            {isCaregiver && (
              <div className="mt-6">
                <Panel title="Caregiving Qualifications & Availability">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="profile-certifications" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Certifications &amp; Credentials
                      </label>
                      <input
                        id="profile-certifications"
                        name="certifications"
                        type="text"
                        value={formData.certifications || ""}
                        onChange={(e) => updateField("certifications", e.target.value)}
                        placeholder="e.g. CNA, BLS/CPR Certified, Dementia Specialist"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-experience" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Years of Experience
                      </label>
                      <input
                        id="profile-experience"
                        name="yearsOfExperience"
                        type="number"
                        min="0"
                        max="75"
                        value={formData.yearsOfExperience || ""}
                        onChange={(e) => updateField("yearsOfExperience", e.target.value)}
                        placeholder="6"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                      {fieldErrors.yearsOfExperience && (
                        <p className="mt-1 text-xs text-[#DC2626] font-medium" role="alert">
                          {fieldErrors.yearsOfExperience}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="profile-availability" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Standard Availability
                      </label>
                      <input
                        id="profile-availability"
                        name="availability"
                        type="text"
                        value={formData.availability || ""}
                        onChange={(e) => updateField("availability", e.target.value)}
                        placeholder="e.g. Full-time, Day & Night Rotations"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="profile-types-of-care" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                        Types of Care Provided
                      </label>
                      <input
                        id="profile-types-of-care"
                        name="typesOfCare"
                        type="text"
                        value={formData.typesOfCare || ""}
                        onChange={(e) => updateField("typesOfCare", e.target.value)}
                        placeholder="e.g. Medication Management, Vital Signs, Meal Assistance"
                        className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                      />
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {/* Form Actions Footer */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                disabled={!isDirty || isSubmitting}
                onClick={() => setShowDiscardModal(true)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#627D98] hover:text-[#102A43] bg-[#FFFFFF] border border-[#D9E2EC] rounded-md hover:bg-[#F4F7FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Discard Edits
              </button>

              <button
                type="submit"
                disabled={!isDirty || isSubmitting}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Saving Changes...
                  </span>
                ) : (
                  "Save Profile Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-modal-title"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#D9E2EC] rounded-xl p-6 shadow-xl text-left">
            <h3 id="discard-modal-title" className="text-base font-bold text-[#102A43]">
              Discard Unsaved Profile Changes?
            </h3>
            <p className="mt-2 text-xs text-[#627D98] leading-relaxed">
              You have made modifications to your profile that have not been saved to the server.
              Reverting will discard all typed edits.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#334E68] bg-[#F4F7FA] border border-[#D9E2EC] rounded-md hover:bg-[#EDF2F7] transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowDiscardModal(false);
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-md transition-colors"
              >
                Discard Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default ProfileRoute;

