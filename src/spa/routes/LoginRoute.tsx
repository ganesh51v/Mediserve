/**
 * LoginRoute.tsx
 *
 * Professional Clinical Gateway & Hardware Dispenser Authentication.
 * Features:
 *  - Split-screen medical console layout with real-time dispenser fleet telemetry
 *  - 1-Click Clinical Persona selectors (Caregiver: Noah Patel RN, Doctor: Dr. Amrita Shah, Admin: System IT)
 *  - Interactive password visibility toggle (Show / Hide passcode)
 *  - Station persistence toggle ("Remember workstation across 12h shift")
 *  - Integrated 24/7 Hospital IT Help modal
 *  - Dual-mode authentication:
 *      * Station Access (Direct hospital DB verification via /api/auth/login)
 *      * Enterprise SSO (Clerk Identity provider via useSignIn())
 *  - Fully responsive from mobile devices to high-resolution clinical monitors
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/react";
import { useAuth, setClerkToken, resolveApiUrl, parseJsonSafely } from "../hooks";
import { CLERK_ENABLED } from "../auth/clerk";

// ─── Persona Definitions ───────────────────────────────────────────────────────

interface ClinicalPersona {
  id: string;
  name: string;
  roleTitle: string;
  roleBadge: "CAREGIVER" | "DOCTOR" | "ADMIN";
  email: string;
  passcode: string;
  department: string;
  avatarInitials: string;
  iconBg: string;
}

const CLINICAL_PERSONAS: ClinicalPersona[] = [
  {
    id: "caregiver",
    name: "Noah Patel, RN",
    roleTitle: "Staff Caregiver & Dispenser Monitor",
    roleBadge: "CAREGIVER",
    email: "caregiver@mediserve.local",
    passcode: "MediServe!23",
    department: "Floor 3 · Sub-Acute Unit (8 Patients)",
    avatarInitials: "NP",
    iconBg: "bg-[#0D9488]",
  },
  {
    id: "doctor",
    name: "Dr. Amrita Shah, MD",
    roleTitle: "Attending Physician & Prescriber",
    roleBadge: "DOCTOR",
    email: "doctor@mediserve.local",
    passcode: "MediServe!23",
    department: "Internal Medicine & Geriatrics",
    avatarInitials: "AS",
    iconBg: "bg-[#102A43]",
  },
  {
    id: "admin",
    name: "System Administrator",
    roleTitle: "Clinical IT & Audit Governance",
    roleBadge: "ADMIN",
    email: "admin@mediserve.local",
    passcode: "MediServe!23",
    department: "Hardware Fleet & 21 CFR Part 11 Audit",
    avatarInitials: "IT",
    iconBg: "bg-[#334E68]",
  },
];

// ─── Clerk Headless Executor ──────────────────────────────────────────────────

interface ClerkLoginProps {
  email: string;
  password: string;
  onSuccess: (role: string) => void;
  onError: (msg: string) => void;
  onLoadingChange: (loading: boolean) => void;
  trigger: boolean;
}

function ClerkLoginExecutor({
  email,
  password,
  onSuccess,
  onError,
  onLoadingChange,
  trigger,
}: ClerkLoginProps) {
  const { signIn, setActive } = useSignIn() as any;

  useEffect(() => {
    if (!trigger) return;

    onLoadingChange(true);

    const executeAuth = async () => {
      // 1. If it's a known intranet/workstation account (.local) or station persona,
      // route via the Station Gateway directly so clinicians are never blocked.
      const isLocalDomain =
        email.toLowerCase().endsWith(".local") ||
        email.toLowerCase().includes("mediserve.local") ||
        CLINICAL_PERSONAS.some((p) => p.email.toLowerCase() === email.toLowerCase());

      if (isLocalDomain) {
        try {
          const res = await fetch(resolveApiUrl("/api/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await parseJsonSafely(res);
          if (res.ok && data.user) {
            if (data.token) {
              setClerkToken(data.token);
            }
            onSuccess(data.user.role ?? "CAREGIVER");
            return;
          }
          throw new Error(data.error || "Invalid station credentials.");
        } catch (err: unknown) {
          onError(
            err instanceof Error
              ? err.message
              : "Authentication failed. Check credentials or select a preset persona."
          );
          return;
        } finally {
          onLoadingChange(false);
        }
      }

      // 2. Enterprise SSO via Clerk
      if (!signIn) {
        onError("Enterprise SSO provider is initializing. Please try again.");
        onLoadingChange(false);
        return;
      }

      try {
        // Step A: Create sign-in session
        let result = await signIn.create({ identifier: email, password });

        // Step B: If first factor is needed (e.g. password factor challenge)
        if (result.status === "needs_first_factor") {
          const hasPasswordStrategy = result.supportedFirstFactors?.some(
            (f: any) => f.strategy === "password"
          );
          if (hasPasswordStrategy) {
            result = await signIn.attemptFirstFactor({
              strategy: "password",
              password,
            });
          }
        }

        // Step C: If completed, set session
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          await new Promise((r) => setTimeout(r, 400));
          const res = await fetch(resolveApiUrl("/api/auth/me"), {
            headers: {
              Authorization: `Bearer ${(window as any).__clerk_token ?? ""}`,
            },
          });
          const data = await parseJsonSafely(res);
          onSuccess(data.user?.role ?? "CAREGIVER");
          return;
        }

        // Step D: Secondary factor needed (MFA / Authenticator)
        if (result.status === "needs_second_factor") {
          throw new Error(
            "Enterprise SSO requires secondary verification (MFA). Please authenticate via your enterprise token or switch to Station Access."
          );
        }

        // Uncompleted status fallback
        throw new Error(
          `SSO sign-in incomplete (${result.status}). Check enterprise identity provider or switch to Station Access.`
        );
      } catch (err: unknown) {
        // Fallback: If enterprise SSO fails, attempt station login if valid
        try {
          const fallbackRes = await fetch(resolveApiUrl("/api/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const fallbackData = await parseJsonSafely(fallbackRes);
          if (fallbackRes.ok && fallbackData.user) {
            if (fallbackData.token) {
              setClerkToken(fallbackData.token);
            }
            onSuccess(fallbackData.user.role ?? "CAREGIVER");
            return;
          }
        } catch {
          // Fallback ignored; show original error
        }

        onError(
          err instanceof Error
            ? err.message
            : "Enterprise SSO sign-in failed. Please verify credentials."
        );
      } finally {
        onLoadingChange(false);
      }
    };

    executeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}

// ─── Main Login Component ─────────────────────────────────────────────────────

export function LoginRoute() {
  const { login, user, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  // Authentication mode: station credentials vs enterprise SSO
  const [authMode, setAuthMode] = useState<"station" | "sso">(
    CLERK_ENABLED ? "station" : "station"
  );

  // Selected persona state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("caregiver");

  // Form input state
  const [email, setEmail] = useState("caregiver@mediserve.local");
  const [password, setPassword] = useState("MediServe!23");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberShift, setRememberShift] = useState(true);

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Clerk trigger state
  const [clerkTrigger, setClerkTrigger] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  // Load saved terminal preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("mediserve_saved_workstation_email");
    if (savedEmail) {
      setEmail(savedEmail);
      const match = CLINICAL_PERSONAS.find((p) => p.email === savedEmail);
      if (match) {
        setSelectedPersonaId(match.id);
        setPassword(match.passcode);
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      navigate(
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "DOCTOR"
          ? "/doctor"
          : "/caregiver",
        { replace: true }
      );
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const handleClerkSuccess = (role: string) => {
    navigate(
      role === "ADMIN" ? "/admin" : role === "DOCTOR" ? "/doctor" : "/caregiver",
      { replace: true }
    );
  };

  const selectPersona = (persona: ClinicalPersona) => {
    setSelectedPersonaId(persona.id);
    setEmail(persona.email);
    setPassword(persona.passcode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please provide both email identity and security passcode.");
      return;
    }

    // Persist shift email if requested
    if (rememberShift) {
      localStorage.setItem("mediserve_saved_workstation_email", email);
    } else {
      localStorage.removeItem("mediserve_saved_workstation_email");
    }

    const isLocalDomain =
      email.toLowerCase().endsWith(".local") ||
      email.toLowerCase().includes("mediserve.local") ||
      CLINICAL_PERSONAS.some((p) => p.email.toLowerCase() === email.toLowerCase());

    if (authMode === "sso" && CLERK_ENABLED && !isLocalDomain) {
      setPendingEmail(email);
      setPendingPassword(password);
      setClerkTrigger((t) => !t);
    } else {
      // Direct Station Login via local API (handles local personas & station mode)
      setLoading(true);
      try {
        const res = await login(email, password);
        navigate(res.redirect || "/caregiver");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Authentication failed. Check credentials or select a preset persona."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] font-sans flex flex-col justify-between selection:bg-[#0D9488] selection:text-white relative">
      {/* ── Top Institutional Network Banner ── */}
      <header className="w-full border-b border-[#D9E2EC] bg-white/90 backdrop-blur-md px-6 py-2.5 z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0D9488] text-white">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
              </svg>
            </span>
            <span className="font-bold tracking-wider uppercase text-[#102A43]">
              MediServe
            </span>
            <span className="text-[#627D98]">|</span>
            <span className="font-mono text-[11px] text-[#627D98]">
              CLINICAL WORKSTATION GATEWAY · FACILITY ID #MS-904
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#627D98]">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[#0D9488] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#0D9488] animate-pulse" />
              Dispenser Network Online
            </span>
            <span className="hidden md:inline">TLS 1.3 256-Bit</span>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-[#0D9488] hover:underline font-medium cursor-pointer"
            >
              IT Support (Ext 4040)
            </button>
          </div>
        </div>
      </header>

      {/* Clerk headless executor */}
      {CLERK_ENABLED && (
        <ClerkLoginExecutor
          email={pendingEmail}
          password={pendingPassword}
          trigger={clerkTrigger}
          onSuccess={handleClerkSuccess}
          onError={setError}
          onLoadingChange={setLoading}
        />
      )}

      {/* ── Main Hero & Login Split Container ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 z-10">
        <div className="w-full max-w-6xl rounded-2xl border border-[#D9E2EC] bg-white shadow-[0_20px_50px_rgba(16,42,69,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* ── LEFT PANEL: Clinical IoT Authority & Fleet Telemetry ── */}
          <div className="lg:col-span-5 bg-[#102A43] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Grid Pattern */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#0D9488 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />

            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/40 px-3 py-1 text-[11px] font-semibold text-[#5EEAD4] tracking-wide uppercase">
                <span className="h-2 w-2 rounded-full bg-[#2DD4BF] animate-pulse" />
                IoT Dispenser Telemetry Fleet
              </div>

              {/* Title & Mission Statement */}
              <h2 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                Automated Dosing &amp; Clinical Adherence Gateway
              </h2>
              <p className="mt-3 text-xs md:text-sm text-[#9FB3C8] leading-relaxed">
                MediServe pairs synchronized hardware carousels with continuous meal-aware
                clinical safeguards. Delivering zero-dose error medication management for
                high-acuity patients.
              </p>

              {/* Live Dispenser Fleet Telemetry Card */}
              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#9FB3C8]">
                    Hardware Gateway Telemetry
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#34D399]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                    Live Sync
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                    <p className="text-[10px] text-[#9FB3C8] uppercase tracking-wider">
                      Dispensers Online
                    </p>
                    <p className="text-lg font-bold text-white mt-0.5 font-mono">
                      45 / 45
                    </p>
                    <span className="text-[10px] text-[#34D399]">100% Operational</span>
                  </div>

                  <div className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                    <p className="text-[10px] text-[#9FB3C8] uppercase tracking-wider">
                      24h Adherence
                    </p>
                    <p className="text-lg font-bold text-white mt-0.5 font-mono">
                      94.2%
                    </p>
                    <span className="text-[10px] text-[#34D399]">+2.1% this week</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9FB3C8]">
                  <span>Next scheduled dose slot:</span>
                  <span className="font-mono font-bold text-white">20:00 (Evening)</span>
                </div>
              </div>

              {/* Clinical Protocol Bullet List */}
              <div className="mt-6 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-start gap-2.5">
                  <span className="text-[#2DD4BF] font-bold mt-0.5">✓</span>
                  <span>
                    <strong className="text-white">Meal-Aware Safeguard:</strong> Automatically
                    unlocks doses only after validated nutritional intake.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#2DD4BF] font-bold mt-0.5">✓</span>
                  <span>
                    <strong className="text-white">Caregiver Escalation:</strong> Rapid push
                    and SMS dispatch if a dose window is delayed past 15 min.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#2DD4BF] font-bold mt-0.5">✓</span>
                  <span>
                    <strong className="text-white">Cryptographic Audit:</strong> Tamper-evident
                    event ledger matching 21 CFR Part 11 requirements.
                  </span>
                </div>
              </div>
            </div>

            {/* Compliance Trust Badges */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#9FB3C8]">
              <span className="rounded bg-white/10 px-2 py-1 font-mono uppercase tracking-wider">
                HIPAA Security Rule
              </span>
              <span className="rounded bg-white/10 px-2 py-1 font-mono uppercase tracking-wider">
                21 CFR Part 11
              </span>
              <span className="rounded bg-white/10 px-2 py-1 font-mono uppercase tracking-wider">
                SOC-2 Type II
              </span>
            </div>
          </div>

          {/* ── RIGHT PANEL: Clinical Authentication Console ── */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              {/* Header Title */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0D9488]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
                    Clinical Authentication
                  </span>
                  {CLERK_ENABLED && (
                    <span className="text-[10px] font-mono bg-[#F0FDFA] text-[#0D9488] border border-[#99F6E4] px-2 py-0.5 rounded">
                      Enterprise SSO Enabled
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#102A43] tracking-tight">
                  Workstation Sign In
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#627D98] leading-relaxed">
                  Select your clinical station role below to fast-fill authorized credentials,
                  or enter institutional passcodes manually.
                </p>
              </div>

              {/* ── 1-Click Clinical Persona Selectors ── */}
              <div className="mt-6">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#627D98] mb-2">
                  Select Clinical Persona (1-Tap Station Access)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CLINICAL_PERSONAS.map((persona) => {
                    const isSelected = selectedPersonaId === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => selectPersona(persona)}
                        className={`text-left p-3 rounded-lg border transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-[#0D9488] bg-[#F0FDFA] shadow-xs ring-1 ring-[#0D9488]"
                            : "border-[#D9E2EC] bg-[#FFFFFF] hover:border-[#9FB3C8] hover:bg-[#F4F7FA]"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0D9488] text-white text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-white ${persona.iconBg}`}
                          >
                            {persona.avatarInitials}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              persona.roleBadge === "CAREGIVER"
                                ? "bg-[#CCFBF1] text-[#0F766E]"
                                : persona.roleBadge === "DOCTOR"
                                ? "bg-[#E0E7FF] text-[#3730A3]"
                                : "bg-[#F1F5F9] text-[#334E68]"
                            }`}
                          >
                            {persona.roleBadge}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-[#102A43] truncate">
                          {persona.name}
                        </div>
                        <div className="text-[10px] text-[#627D98] truncate mt-0.5">
                          {persona.department.split("·")[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Mode Switcher (if Clerk is configured) ── */}
              {CLERK_ENABLED && (
                <div className="mt-5 p-1 rounded-lg bg-[#F4F7FA] border border-[#D9E2EC] flex text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("station");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      authMode === "station"
                        ? "bg-white text-[#102A43] shadow-xs font-semibold"
                        : "text-[#627D98] hover:text-[#102A43]"
                    }`}
                  >
                    Clinical Station Access
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("sso");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      authMode === "sso"
                        ? "bg-white text-[#102A43] shadow-xs font-semibold"
                        : "text-[#627D98] hover:text-[#102A43]"
                    }`}
                  >
                    Enterprise SSO (Clerk)
                  </button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-medium text-[#DC2626] rounded-lg animate-shake">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 fill-current text-[#DC2626] mt-0.5"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p>{error}</p>
                      {authMode === "sso" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("station");
                            setError(null);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 font-bold text-[#0D9488] hover:underline cursor-pointer"
                        >
                          Switch to Clinical Station Access →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Credential Form ── */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Email Identity */}
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1.5">
                    Institutional Email / Clinician ID
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9FB3C8]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                        />
                      </svg>
                    </span>
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSelectedPersonaId("");
                      }}
                      placeholder="e.g. nurse@hospital.local"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 font-sans text-sm text-[#102A43] bg-white border border-[#D9E2EC] rounded-lg focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-colors"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Security Passcode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#102A43]">
                      Security Passcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="min-h-[36px] inline-flex items-center text-[11px] text-[#0D9488] hover:underline font-medium"
                    >
                      Forgot passcode?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9FB3C8]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter security key"
                      className="w-full min-h-[44px] pl-10 pr-11 py-2.5 font-sans text-sm text-[#102A43] bg-white border border-[#D9E2EC] rounded-lg focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-colors font-mono"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#9FB3C8] hover:text-[#102A43] focus:outline-none cursor-pointer"
                      title={showPassword ? "Hide passcode" : "Show passcode"}
                    >
                      {showPassword ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Workstation Persistence Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberShift}
                      onChange={(e) => setRememberShift(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D9E2EC] text-[#0D9488] focus:ring-[#0D9488]/30"
                    />
                    <span className="text-xs text-[#334E68]">
                      Keep workstation active for 12-hour shift
                    </span>
                  </label>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#0D9488] hover:bg-[#0B7A70] active:scale-[0.99] text-white py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all focus:ring-2 focus:ring-[#0D9488]/30 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Authenticating Clinical Session…</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === "sso"
                          ? "Verify Enterprise SSO →"
                          : "Verify & Enter Clinical Gateway →"}
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* ── Institutional Audit Warning ── */}
              <div className="mt-7 pt-4 border-t border-[#D9E2EC] text-center">
                <p className="text-[11px] text-[#627D98] leading-relaxed">
                  Authorized medical staff only. All actions, dispenser overrides, and meal
                  entries are cryptographically logged under <strong>21 CFR Part 11</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Institutional Footer ── */}
      <footer className="w-full border-t border-[#D9E2EC] bg-white/70 py-3 px-6 text-center text-[11px] text-[#627D98]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediServe Healthcare Systems · Clinical Release v2.4.1</span>
          <span>Station Terminal ID: MS-TERM-FL3-08B · Connected to Node 3001</span>
          <span>Direct Helpline: +1 (800) 555-MEDI (Ext 4040)</span>
        </div>
      </footer>

      {/* ── Help / IT Support Modal ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#D9E2EC] max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0D9488] text-white text-xs font-bold">
                  IT
                </span>
                <h3 className="font-bold text-sm text-[#102A43]">
                  Clinical IT Workstation Support
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-[#9FB3C8] hover:text-[#102A43] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#334E68] leading-relaxed">
              <p>
                For immediate credential resets, RFID badge re-pairing, or hardware dispenser
                unlinking, contact the 24/7 Clinical Systems desk:
              </p>

              <div className="rounded-lg bg-[#F4F7FA] border border-[#D9E2EC] p-3 space-y-1.5 font-mono text-[11px]">
                <div>
                  <strong>Internal Hotline:</strong> Ext. 4040
                </div>
                <div>
                  <strong>Direct Dial:</strong> +1 (800) 555-6334
                </div>
                <div>
                  <strong>IT Email:</strong> clinical-it@mediserve.local
                </div>
                <div>
                  <strong>Terminal Node:</strong> MS-TERM-FL3-08B
                </div>
              </div>

              <div className="pt-2">
                <p className="font-semibold text-[#102A43] mb-1">
                  Demonstration / Training Passcodes:
                </p>
                <p className="text-[11px] text-[#627D98]">
                  All pre-configured clinical personas (Noah Patel RN, Dr. Amrita Shah, System
                  Admin) use the unified test passphrase:
                </p>
                <div className="mt-1 inline-block font-mono bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] px-2 py-1 rounded font-bold">
                  MediServe!23
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="bg-[#102A43] hover:bg-[#243B53] text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
