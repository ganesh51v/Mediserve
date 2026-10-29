import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks";
import { Shell, Panel } from "../components/ui";
import { useAdminConsoleData } from "../hooks/useAdminConsoleData";

/**
 * AdminConsoleRoute (Rebuild of Admin Directory)
 *
 * Implements complete parity with AdminDirectoryRoute while providing:
 * - Robust input validation and inline error messaging
 * - Automatic care-team pre-population upon selecting a patient
 * - Granular empty states for patients, providers, and hardware fleet
 * - On-demand registry reload/refresh capability
 * - Explicit role-based access control defense-in-depth
 * - Fully accessible ARIA semantics and compliant 44px touch targets
 */
export function AdminConsoleRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error, reload, assignCareTeam, provisionDevice } = useAdminConsoleData();

  // Form State: Care Team Assignment
  const [assignPatientId, setAssignPatientId] = useState<string>("");
  const [assignDoctorId, setAssignDoctorId] = useState<string>("");
  const [assignCaregiverId, setAssignCaregiverId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  const [assignSuccess, setAssignSuccess] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Form State: Hardware Provisioning
  const [deviceSerial, setDeviceSerial] = useState<string>("");
  const [devicePatientId, setDevicePatientId] = useState<string>("");
  const [deviceLoading, setDeviceLoading] = useState<boolean>(false);
  const [deviceSuccess, setDeviceSuccess] = useState<boolean>(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // When patient selection changes, auto-populate existing assignment if present
  useEffect(() => {
    if (!data?.patients || data.patients.length === 0) return;

    const currentPatientId = assignPatientId || data.patients[0]?.id;
    if (!currentPatientId) return;

    const activePatient = data.patients.find((p) => p.id === currentPatientId);
    const existingAssignment = activePatient?.assignments?.find((a) => a.active);

    if (existingAssignment) {
      if (existingAssignment.doctorId) setAssignDoctorId(existingAssignment.doctorId);
      if (existingAssignment.caregiverId) setAssignCaregiverId(existingAssignment.caregiverId);
    }
  }, [assignPatientId, data?.patients]);

  // Auth gate: Loading
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm font-medium text-[#627D98]">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0D9488] animate-ping" />
          <span>Checking administrative session...</span>
        </div>
      </div>
    );
  }

  // Auth gate: Unauthenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Auth gate: Role Defense-in-depth
  if (user.role !== "ADMIN") {
    return (
      <Shell user={user} onLogout={logout}>
        <div className="max-w-xl mx-auto my-12 p-6 bg-[#FFFFFF] border border-[#FCA5A5] rounded-xl text-center shadow-xs">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626] mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#102A43]">Access Restricted</h2>
          <p className="mt-2 text-xs text-[#627D98] leading-relaxed">
            Your current role (<span className="font-semibold text-[#102A43]">{user.role}</span>) does not have authorization to view or modify administrative governance directory settings.
          </p>
          <div className="mt-5">
            <Link
              to="/"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors"
            >
              Return to Clinical Portal
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // Care Team Assignment Handler
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    const pid = assignPatientId || data?.patients[0]?.id;
    if (!pid) {
      setAssignError("Please select a patient from the registry.");
      return;
    }

    if (!assignDoctorId && !assignCaregiverId) {
      setAssignError("Please select at least an attending physician or a primary caregiver to assign.");
      return;
    }

    try {
      setAssignLoading(true);
      await assignCareTeam(pid, assignDoctorId, assignCaregiverId);
      setAssignSuccess(true);
      const timer = setTimeout(() => setAssignSuccess(false), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to update care team assignment.");
    } finally {
      setAssignLoading(false);
    }
  };

  // Hardware Device Provisioning Handler
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);

    const cleanSerial = deviceSerial.trim();
    if (!cleanSerial) {
      setDeviceError("Device serial number is required.");
      return;
    }

    if (cleanSerial.length < 3) {
      setDeviceError("Serial number must contain at least 3 characters.");
      return;
    }

    try {
      setDeviceLoading(true);
      await provisionDevice(cleanSerial, devicePatientId || undefined);
      setDeviceSerial("");
      setDeviceSuccess(true);
      const timer = setTimeout(() => setDeviceSuccess(false), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : "Failed to provision dispensary hardware.");
    } finally {
      setDeviceLoading(false);
    }
  };

  return (
    <Shell user={user} onLogout={logout}>
      {/* Header Section */}
      <section className="mb-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
                System Administration &middot; Governance &amp; Provisioning
              </p>
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
              System <span className="text-[#334E68]">Directory</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#627D98] leading-relaxed">
              Governance portal for user roles, patient care-team assignments, hardware provisioning,
              and fleet configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reload()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-semibold text-[#334E68] bg-[#FFFFFF] border border-[#D9E2EC] rounded-md hover:bg-[#F4F7FA] hover:text-[#102A43] transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh administrative data registry"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin text-[#0D9488]" : "text-[#627D98]"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? "Syncing..." : "Sync Registry"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Loading Banner */}
      {loading && !data && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg shadow-2xs">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0D9488] animate-pulse" />
            Loading administrative registry...
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg shadow-2xs" role="alert">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => reload()}
            className="ml-3 underline font-bold hover:text-[#991B1B]"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Summary Stat Cards */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Total Users", value: data.users.length, color: "#102A43" },
              { label: "Patients", value: data.patients.length, color: "#0D9488" },
              { label: "Doctors", value: data.doctors.length, color: "#334E68" },
              { label: "Caregivers", value: data.caregivers.length, color: "#334E68" },
              { label: "Dispensers", value: data.devices.length, color: "#102A43" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="border border-[#D9E2EC] bg-[#FFFFFF] rounded-lg p-4 text-center shadow-[0_1px_3px_0_rgba(16,42,69,0.04)] hover:border-[#CBD5E1] transition-all"
              >
                <div className="font-sans text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#627D98]">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Panel 1: Care Team Assignments */}
            <Panel title="Care Team Assignments">
              <p className="text-xs text-[#627D98] mb-4">
                Bind licensed physicians and assigned caregivers to patient clinical profiles.
              </p>

              {assignSuccess && (
                <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs font-semibold text-[#0D9488] flex items-center justify-between" role="status">
                  <div className="flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Care team assignment successfully saved!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignSuccess(false)}
                    className="text-[#0D9488] hover:text-[#0F766E] font-bold text-xs"
                    aria-label="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              )}

              {assignError && (
                <div className="mb-4 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#DC2626] flex items-center justify-between" role="alert">
                  <div className="flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>{assignError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignError(null)}
                    className="text-[#DC2626] hover:text-[#991B1B] font-bold text-xs"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleAssign} className="grid gap-3.5 text-sm">
                <div>
                  <label htmlFor="assign-patient-select" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Select Patient
                  </label>
                  <select
                    id="assign-patient-select"
                    value={assignPatientId || data.patients[0]?.id || ""}
                    onChange={(e) => setAssignPatientId(e.target.value)}
                    disabled={data.patients.length === 0}
                    className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all disabled:bg-[#F4F7FA] disabled:text-[#9FB3C8]"
                  >
                    {data.patients.length === 0 ? (
                      <option value="">No registered patients found</option>
                    ) : (
                      data.patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.mrn})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="assign-doctor-select" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Attending Physician
                    </label>
                    <select
                      id="assign-doctor-select"
                      value={assignDoctorId}
                      onChange={(e) => setAssignDoctorId(e.target.value)}
                      className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    >
                      <option value="">Choose Doctor...</option>
                      {data.doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.name}{d.specialty ? ` (${d.specialty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="assign-caregiver-select" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Primary Caregiver
                    </label>
                    <select
                      id="assign-caregiver-select"
                      value={assignCaregiverId}
                      onChange={(e) => setAssignCaregiverId(e.target.value)}
                      className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    >
                      <option value="">Choose Caregiver...</option>
                      {data.caregivers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={assignLoading || data.patients.length === 0}
                  className="mt-1 min-h-[44px] bg-[#0D9488] hover:bg-[#0F766E] text-white py-2.5 px-4 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {assignLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Updating Assignments...
                    </span>
                  ) : (
                    "Save Care Team Assignment"
                  )}
                </button>
              </form>

              {/* Current Patient Assignments Registry */}
              <div className="mt-6 border-t border-[#D9E2EC] pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#627D98] mb-3 flex items-center justify-between">
                  <span>Current Patient Registry &amp; Teams</span>
                  <span className="font-mono text-[10px] text-[#627D98]">{data.patients.length} Registered</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.patients.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[#D9E2EC] p-4 text-center text-xs text-[#627D98]">
                      No patients registered in directory.
                    </div>
                  ) : (
                    data.patients.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border border-[#EDF2F7] bg-[#F4F7FA] px-3 py-2 text-xs hover:border-[#D9E2EC] transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-[#102A43] truncate block sm:inline">{p.name}</span>
                          <span className="font-mono text-[10px] text-[#627D98] sm:ml-2">({p.mrn})</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#0D9488] font-medium shrink-0">
                          {p.assignments?.length ?? 0} provider(s) assigned
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>

            {/* Panel 2: Device Provisioning Panel */}
            <Panel title="Register Dispensary Hardware">
              <p className="text-xs text-[#627D98] mb-4">
                Provision physical ESP32 or simulated dispensary units by registering hardware serial numbers.
              </p>

              {deviceSuccess && (
                <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs font-semibold text-[#0D9488] flex items-center justify-between" role="status">
                  <div className="flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Dispenser hardware provisioned successfully!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceSuccess(false)}
                    className="text-[#0D9488] hover:text-[#0F766E] font-bold text-xs"
                    aria-label="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              )}

              {deviceError && (
                <div className="mb-4 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#DC2626] flex items-center justify-between" role="alert">
                  <div className="flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>{deviceError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceError(null)}
                    className="text-[#DC2626] hover:text-[#991B1B] font-bold text-xs"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleRegisterDevice} className="grid gap-3.5 text-sm">
                <div>
                  <label htmlFor="device-serial-input" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Device Serial Number
                  </label>
                  <input
                    id="device-serial-input"
                    name="serial"
                    required
                    placeholder="e.g. MS-DISP-D4 or ESP32-MAC"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                  />
                </div>

                <div>
                  <label htmlFor="device-patient-select" className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Assign to Patient (Optional)
                  </label>
                  <select
                    id="device-patient-select"
                    value={devicePatientId}
                    onChange={(e) => setDevicePatientId(e.target.value)}
                    className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  >
                    <option value="">Unassigned (Inventory)</option>
                    {data.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mrn})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={deviceLoading || !deviceSerial.trim()}
                  className="mt-1 min-h-[44px] bg-[#102A43] hover:bg-[#243B53] text-white py-2.5 px-4 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {deviceLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Provisioning...
                    </span>
                  ) : (
                    "Provision Hardware Unit"
                  )}
                </button>
              </form>

              {/* Hardware Inventory Quick View */}
              <div className="mt-6 border-t border-[#D9E2EC] pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#627D98] mb-3 flex items-center justify-between">
                  <span>Provisioned Fleet</span>
                  <span className="font-mono text-[10px] text-[#627D98]">{data.devices.length} Units</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.devices.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[#D9E2EC] p-4 text-center text-xs text-[#627D98]">
                      No dispensary hardware units provisioned yet.
                    </div>
                  ) : (
                    data.devices.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-md border border-[#EDF2F7] bg-[#F4F7FA] px-3 py-2 text-xs hover:border-[#D9E2EC] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${d.online ? "bg-[#0D9488]" : "bg-[#9FB3C8]"}`}
                            title={d.online ? "Online" : "Offline"}
                          />
                          <span className="font-mono font-semibold text-[#102A43] truncate">{d.serial}</span>
                        </div>
                        <span className="text-[11px] text-[#627D98] shrink-0 ml-2">
                          {d.patient ? (
                            <span className="text-[#334E68] font-medium">{d.patient.name}</span>
                          ) : (
                            <span className="text-[#9FB3C8]">Unassigned</span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </Shell>
  );
}
export default AdminConsoleRoute;

