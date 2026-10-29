/**
 * RegisterRoute.tsx
 *
 * Framework Choice: React 19 + TypeScript + Vite + Tailwind CSS.
 * This aligns with MediServe's existing frontend SPA stack, providing accessible,
 * responsive form controls, real-time client-side validation, role-dependent
 * clinical input panels, and HIPAA-compliant verification gating.
 *
 * Features:
 *  - 2-Role Clinical Selector (Doctor vs Caregiver)
 *  - Common account details (Full Legal Name, Email, Phone, Password, Confirm Password)
 *  - Doctor verification fields (License number, issuing authority, specialty, affiliation, years)
 *  - Caregiver verification fields (Certifications, experience, types of care, availability)
 *  - Real-time client-side field validation with field-level error banners
 *  - Security by design: Passwords hashed server-side, sensitive fields protected
 *  - Post-submission "Pending Administrative Verification" confirmation gate
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks";

type RoleType = "DOCTOR" | "CAREGIVER";

export function RegisterRoute() {
  const { register } = useAuth();

  // Role selector state
  const [role, setRole] = useState<RoleType>("CAREGIVER");

  // Common account fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Doctor-specific fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");
  const [yearsOfPractice, setYearsOfPractice] = useState("5");

  // Caregiver-specific fields
  const [certifications, setCertifications] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("3");
  const [typesOfCare, setTypesOfCare] = useState("Elderly Care, Medication Administration");
  const [availability, setAvailability] = useState("Full-Time (Day / Evening Shifts)");

  // Form interaction state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success / Pending Verification state
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    role: string;
    credentialSummary: string;
  } | null>(null);

  // ─── Client-side Validation ────────────────────────────────────────────────
  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Common fields
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full legal name is required (minimum 2 characters).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid clinical email address.";
    }

    const digits = phone.replace(/\D/g, "");
    if (!phone.trim() || digits.length < 10) {
      errors.phone = "Valid contact phone number with at least 10 digits is required.";
    }

    if (!password) {
      errors.password = "Security passcode is required.";
    } else if (password.length < 8) {
      errors.password = "Passcode must be at least 8 characters long.";
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9!@#$%^&*]/.test(password)) {
      errors.password = "Must contain uppercase, lowercase, and a number or symbol.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passcode confirmation does not match.";
    }

    // 2. Role-specific validation
    if (role === "DOCTOR") {
      if (!licenseNumber.trim() || licenseNumber.trim().length < 3) {
        errors.licenseNumber = "Medical license number is required for physician verification.";
      }
      if (!issuingAuthority.trim() || issuingAuthority.trim().length < 2) {
        errors.issuingAuthority = "Issuing medical board or health authority is required.";
      }
      if (!specialty.trim()) {
        errors.specialty = "Medical specialty is required.";
      }
      if (!hospitalAffiliation.trim() || hospitalAffiliation.trim().length < 2) {
        errors.hospitalAffiliation = "Hospital, clinic, or practice affiliation is required.";
      }
      const yop = Number(yearsOfPractice);
      if (isNaN(yop) || yop < 0) {
        errors.yearsOfPractice = "Years of medical practice must be 0 or greater.";
      }
    } else if (role === "CAREGIVER") {
      if (!certifications.trim() || certifications.trim().length < 2) {
        errors.certifications = "Certifications or training credentials are required (e.g. CNA, HHA, BLS).";
      }
      const yoe = Number(yearsOfExperience);
      if (isNaN(yoe) || yoe < 0) {
        errors.yearsOfExperience = "Years of care experience must be 0 or greater.";
      }
      if (!typesOfCare.trim() || typesOfCare.trim().length < 2) {
        errors.typesOfCare = "Types of care provided must be specified.";
      }
      if (!availability.trim() || availability.trim().length < 2) {
        errors.availability = "Work shift availability is required.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateClientSide()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        name: fullName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
        role,
      };

      if (role === "DOCTOR") {
        payload.licenseNumber = licenseNumber.trim();
        payload.issuingAuthority = issuingAuthority.trim();
        payload.specialty = specialty.trim();
        payload.hospitalAffiliation = hospitalAffiliation.trim();
        payload.yearsOfPractice = Number(yearsOfPractice);
      } else {
        payload.certifications = certifications.trim();
        payload.yearsOfExperience = Number(yearsOfExperience);
        payload.typesOfCare = typesOfCare.trim();
        payload.availability = availability.trim();
      }

      await register(payload);

      setSubmittedData({
        name: fullName.trim(),
        email: email.trim(),
        role,
        credentialSummary:
          role === "DOCTOR"
            ? `License #${licenseNumber} (${issuingAuthority}) · ${specialty}`
            : `${certifications} · ${yearsOfExperience} yrs exp`,
      });

      setRegistrationSubmitted(true);
    } catch (err: any) {
      if (err?.errors) {
        setFieldErrors(err.errors);
      }
      setGeneralError(err?.message || "Registration failed. Please review your entries.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success Confirmation Screen: Pending Clinical Verification Gate ────────
  if (registrationSubmitted && submittedData) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] font-sans flex flex-col justify-between selection:bg-[#0D9488] selection:text-white">
        <header className="w-full border-b border-[#D9E2EC] bg-white/90 backdrop-blur-md px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0D9488] text-white font-bold text-xs">
                +
              </span>
              <span className="font-bold tracking-wider uppercase text-sm text-[#102A43]">
                MediServe Clinical Gateway
              </span>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
            >
              Back to Sign In &rarr;
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#D9E2EC] p-8 sm:p-10 text-center animate-fade-in">
            {/* Verification Status Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-100 text-amber-900 mb-3">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Credentials Queued · Pending Verification
            </span>

            <h1 className="text-2xl font-bold tracking-tight text-[#102A43] mb-3">
              Onboarding Received for {submittedData.name}
            </h1>

            <p className="text-sm text-[#486581] leading-relaxed mb-6">
              In accordance with hospital clinical governance and 21 CFR Part 11 protocols, all medical
              practitioner and caregiver accounts are subject to administrative verification before access
              to patient medication records, dispenser telemetry, and clinical dashboards is unlocked.
            </p>

            <div className="bg-[#F0F4F8] rounded-xl p-5 text-left text-xs space-y-2 mb-8 border border-[#D9E2EC]">
              <div className="flex justify-between border-b border-[#D9E2EC] pb-2">
                <span className="text-[#627D98] font-medium">Assigned Role:</span>
                <span className="font-bold text-[#102A43]">{submittedData.role}</span>
              </div>
              <div className="flex justify-between border-b border-[#D9E2EC] pb-2">
                <span className="text-[#627D98] font-medium">Registered Email:</span>
                <span className="font-mono text-[#102A43]">{submittedData.email}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#627D98] font-medium">Submitted Credentials:</span>
                <span className="font-medium text-[#102A43]">{submittedData.credentialSummary}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="w-full inline-flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0B7A6F] shadow-md transition-colors"
              >
                Return to Clinical Workstation Sign In &rarr;
              </Link>
              <p className="text-[11px] text-[#829AB1]">
                Need immediate station clearance? Contact Facility IT Support at Ext 4040.
              </p>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-[#D9E2EC] bg-white py-3 text-center text-[11px] text-[#829AB1]">
          MediServe Clinical Registration & Verification Engine · TLS 1.3 256-Bit Encrypted
        </footer>
      </div>
    );
  }

  // ─── Registration Form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] font-sans flex flex-col justify-between selection:bg-[#0D9488] selection:text-white">
      {/* Top Bar */}
      <header className="w-full border-b border-[#D9E2EC] bg-white/90 backdrop-blur-md px-6 py-3 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0D9488] text-white font-bold text-xs">
              +
            </span>
            <span className="font-bold tracking-wider uppercase text-sm text-[#102A43]">
              MediServe Clinical Gateway
            </span>
            <span className="text-[#9FB3C8]">|</span>
            <span className="font-mono text-[11px] text-[#627D98] hidden sm:inline">
              CLINICAL PRACTITIONER & CAREGIVER ONBOARDING
            </span>
          </div>

          <Link
            to="/login"
            className="font-medium text-[#0D9488] hover:underline"
          >
            Already registered? Sign in &rarr;
          </Link>
        </div>
      </header>

      {/* Main Registration Layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-[#D9E2EC] overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#102A43] to-[#243B53] text-white p-6 sm:p-8">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#0D9488] text-white mb-2">
              Clinical Access Onboarding
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Create Authorized Healthcare Account
            </h1>
            <p className="text-xs sm:text-sm text-[#BCCCDC] mt-2">
              Onboard as an attending physician or staff caregiver to monitor dispenser telemetry and medication plans.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* General Error Banner */}
            {generalError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{generalError}</span>
              </div>
            )}

            {/* ─── Role Selector ─── */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#486581] mb-2">
                Select Clinical Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Caregiver Selector */}
                <button
                  type="button"
                  onClick={() => {
                    setRole("CAREGIVER");
                    setFieldErrors({});
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "CAREGIVER"
                      ? "border-[#0D9488] bg-teal-50/50 ring-2 ring-[#0D9488]"
                      : "border-[#D9E2EC] hover:border-[#9FB3C8] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#102A43]">Caregiver / Staff Nurse</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#E6FFFA] text-[#0D9488]">
                      CAREGIVER
                    </span>
                  </div>
                  <p className="text-xs text-[#627D98]">
                    Daily medication monitoring, dispenser telemetry, alerts & patient meal recording.
                  </p>
                </button>

                {/* Doctor Selector */}
                <button
                  type="button"
                  onClick={() => {
                    setRole("DOCTOR");
                    setFieldErrors({});
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "DOCTOR"
                      ? "border-[#102A43] bg-blue-50/50 ring-2 ring-[#102A43]"
                      : "border-[#D9E2EC] hover:border-[#9FB3C8] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#102A43]">Attending Doctor / MD</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#EBF8FF] text-[#2B6CB0]">
                      DOCTOR
                    </span>
                  </div>
                  <p className="text-xs text-[#627D98]">
                    Prescription authorization, regimen scheduling, clinical notes & adherence reviews.
                  </p>
                </button>
              </div>
            </div>

            {/* ─── Section 1: Common Account Credentials ─── */}
            <div className="border-t border-[#D9E2EC] pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#334E68] mb-4">
                1. Account Credentials & Contact
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#334E68] mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === "DOCTOR" ? "e.g. Dr. Jane Doe, MD" : "e.g. Michael Smith, RN"}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] focus:outline-none focus:ring-2 ${
                      fieldErrors.fullName
                        ? "border-red-400 focus:ring-red-200"
                        : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#334E68] mb-1">
                    Institutional Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="practitioner@hospital.org"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] focus:outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? "border-red-400 focus:ring-red-200"
                        : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-[#334E68] mb-1">
                    Direct Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-9000"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] focus:outline-none focus:ring-2 ${
                      fieldErrors.phone
                        ? "border-red-400 focus:ring-red-200"
                        : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Passcode */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-[#334E68]">
                      Security Passcode <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#0D9488] hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars (uppercase, lowercase, number/symbol)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] focus:outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? "border-red-400 focus:ring-red-200"
                        : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Passcode */}
                <div>
                  <label className="block text-xs font-semibold text-[#334E68] mb-1">
                    Confirm Security Passcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter security passcode"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] focus:outline-none focus:ring-2 ${
                      fieldErrors.confirmPassword
                        ? "border-red-400 focus:ring-red-200"
                        : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Section 2: Role-Specific Verification Details ─── */}
            <div className="border-t border-[#D9E2EC] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#334E68]">
                  {role === "DOCTOR"
                    ? "2. Physician Licensing & Professional Verification"
                    : "2. Caregiver Credentials & Availability"}
                </h2>
                <span className="text-[11px] font-medium text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Required for 21 CFR Part 11 Clearance
                </span>
              </div>

              {/* ── DOCTOR FIELDS ── */}
              {role === "DOCTOR" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  {/* Medical License */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      State / National Medical License # <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. MED-CA-987654"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.licenseNumber
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.licenseNumber && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.licenseNumber}</p>
                    )}
                  </div>

                  {/* Issuing Authority */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Issuing Medical Board / Authority <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. Medical Board of California"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.issuingAuthority
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.issuingAuthority && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.issuingAuthority}</p>
                    )}
                  </div>

                  {/* Specialty */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Primary Clinical Specialty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E2EC] text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 focus:border-[#0D9488] focus:ring-teal-100"
                    >
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Geriatrics">Geriatrics & Palliative Care</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Endocrinology">Endocrinology & Diabetes</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Primary Care">Primary Care & Family Medicine</option>
                    </select>
                  </div>

                  {/* Years of Practice */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Years in Active Medical Practice <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="70"
                      value={yearsOfPractice}
                      onChange={(e) => setYearsOfPractice(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.yearsOfPractice
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.yearsOfPractice && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.yearsOfPractice}</p>
                    )}
                  </div>

                  {/* Hospital Affiliation */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Hospital / Clinic / Health Network Affiliation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                      placeholder="e.g. Metro Health General Hospital & Ambulatory Center"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.hospitalAffiliation
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.hospitalAffiliation && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.hospitalAffiliation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── CAREGIVER FIELDS ── */}
              {role === "CAREGIVER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  {/* Certifications */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Certifications & Training Credentials <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="e.g. CNA, BLS/CPR, Medication Administration Certified, HHA"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.certifications
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.certifications && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.certifications}</p>
                    )}
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Years of Caregiving Experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.yearsOfExperience
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.yearsOfExperience && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.yearsOfExperience}</p>
                    )}
                  </div>

                  {/* Availability */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Shift Availability <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E2EC] text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 focus:border-[#0D9488] focus:ring-teal-100"
                    >
                      <option value="Full-Time (Day / Evening Shifts)">Full-Time (Day / Evening Shifts)</option>
                      <option value="Night Shifts & 24h Vigilance">Night Shifts & 24h Vigilance</option>
                      <option value="Weekend Sub-Acute Coverage">Weekend Sub-Acute Coverage</option>
                      <option value="Part-Time / Per Diem">Part-Time / Per Diem</option>
                      <option value="On-Call Emergency Dispenser Monitor">On-Call Emergency Dispenser Monitor</option>
                    </select>
                  </div>

                  {/* Types of Care */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#334E68] mb-1">
                      Types of Care Provided <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={typesOfCare}
                      onChange={(e) => setTypesOfCare(e.target.value)}
                      placeholder="e.g. Elderly Care, Dementia Support, Post-Surgical, Medication Adherence"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#102A43] bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.typesOfCare
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#D9E2EC] focus:border-[#0D9488] focus:ring-teal-100"
                      }`}
                    />
                    {fieldErrors.typesOfCare && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.typesOfCare}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & Governance Notice */}
            <div className="bg-[#F0F4F8] p-4 rounded-xl text-xs text-[#627D98] flex items-start gap-3">
              <svg className="h-5 w-5 text-[#0D9488] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="font-semibold text-[#334E68]">Healthcare Credential & Privacy Protection</p>
                <p className="mt-0.5 leading-relaxed">
                  Passcodes are stored exclusively as salted hashes (bcrypt factor 12). Professional details are protected at rest and in transit via TLS 1.3. New submissions remain in a non-active verification queue until reviewed.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0D9488] hover:bg-[#0B7A6F] shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Submitting Clinical Verification Request...
                  </span>
                ) : (
                  `SUBMIT & QUEUE FOR ${role === "DOCTOR" ? "PHYSICIAN" : "CAREGIVER"} CLEARANCE →`
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#D9E2EC] bg-white py-4 text-center text-xs text-[#829AB1]">
        MediServe Clinical Gateway · Facility ID #MS-904 · 21 CFR Part 11 Electronic Records Verified
      </footer>
    </div>
  );
}
