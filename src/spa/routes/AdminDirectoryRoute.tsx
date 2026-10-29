import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useAdminDirectory } from "../hooks";
import { Shell, Panel } from "../components/ui";

export function AdminDirectoryRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error, assign, registerDevice } = useAdminDirectory();

  const [assignPatientId, setAssignPatientId] = useState("");
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assignCaregiverId, setAssignCaregiverId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const [deviceSerial, setDeviceSerial] = useState("");
  const [devicePatientId, setDevicePatientId] = useState("");
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceSuccess, setDeviceSuccess] = useState(false);

  if (authLoading) return <div className="p-8 text-center text-sm text-[#627D98]">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = assignPatientId || data?.patients[0]?.id;
    if (!pid) return;
    try {
      setAssignLoading(true);
      await assign(pid, assignDoctorId, assignCaregiverId);
      setAssignSuccess(true);
      setTimeout(() => setAssignSuccess(false), 3000);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceSerial.trim()) return;
    try {
      setDeviceLoading(true);
      await registerDevice(deviceSerial.trim(), devicePatientId);
      setDeviceSerial("");
      setDeviceSuccess(true);
      setTimeout(() => setDeviceSuccess(false), 3000);
    } finally {
      setDeviceLoading(false);
    }
  };

  return (
    <Shell user={user} onLogout={logout}>
      <section className="mb-8 max-w-4xl">
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
      </section>

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Loading administrative registry...
        </div>
      )}
      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg">
          {error}
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
                className="border border-[#D9E2EC] bg-[#FFFFFF] rounded-lg p-4 text-center shadow-[0_1px_3px_0_rgba(16,42,69,0.04)]"
              >
                <div className="font-sans text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#627D98]">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Care Team Assignment Panel */}
            <Panel title="Care Team Assignments">
              <p className="text-xs text-[#627D98] mb-4">
                Bind licensed physicians and assigned caregivers to patient clinical profiles.
              </p>

              {assignSuccess && (
                <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs font-semibold text-[#0D9488]">
                  ✓ Care team assignment successfully saved!
                </div>
              )}

              <form onSubmit={handleAssign} className="grid gap-3.5 text-sm">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Select Patient
                  </label>
                  <select
                    value={assignPatientId || data.patients[0]?.id || ""}
                    onChange={(e) => setAssignPatientId(e.target.value)}
                    className="w-full border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  >
                    {data.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mrn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Attending Physician
                    </label>
                    <select
                      value={assignDoctorId}
                      onChange={(e) => setAssignDoctorId(e.target.value)}
                      className="w-full border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
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
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                      Primary Caregiver
                    </label>
                    <select
                      value={assignCaregiverId}
                      onChange={(e) => setAssignCaregiverId(e.target.value)}
                      className="w-full border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
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
                  disabled={assignLoading}
                  className="mt-1 min-h-[44px] bg-[#0D9488] hover:bg-[#0F766E] text-white py-2.5 px-4 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {assignLoading ? "Updating Assignments..." : "Save Care Team Assignment"}
                </button>
              </form>

              {/* Current Patient Assignments */}
              <div className="mt-6 border-t border-[#D9E2EC] pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#627D98] mb-3">
                  Current Patient Registry &amp; Teams
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.patients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-[#EDF2F7] bg-[#F4F7FA] px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#102A43]">{p.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-[#627D98]">{p.mrn}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#0D9488] font-medium">
                        {p.assignments?.length ?? 0} provider(s) assigned
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Device Provisioning Panel */}
            <Panel title="Register Dispensary Hardware">
              <p className="text-xs text-[#627D98] mb-4">
                Provision physical ESP32 or simulated dispensary units by registering hardware serial numbers.
              </p>

              {deviceSuccess && (
                <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs font-semibold text-[#0D9488]">
                  ✓ Dispenser hardware provisioned successfully!
                </div>
              )}

              <form onSubmit={handleRegisterDevice} className="grid gap-3.5 text-sm">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Device Serial Number
                  </label>
                  <input
                    name="serial"
                    required
                    placeholder="e.g. MS-DISP-D4 or ESP32-MAC"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    className="w-full min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] rounded-md px-3 py-2 text-sm font-mono text-[#102A43] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all placeholder:text-[#9FB3C8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#334E68] mb-1">
                    Assign to Patient (Optional)
                  </label>
                  <select
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
                  disabled={deviceLoading}
                  className="mt-1 min-h-[44px] bg-[#102A43] hover:bg-[#243B53] text-white py-2.5 px-4 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {deviceLoading ? "Provisioning..." : "Provision Hardware Unit"}
                </button>
              </form>

              {/* Hardware Inventory Quick View */}
              <div className="mt-6 border-t border-[#D9E2EC] pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#627D98] mb-3">
                  Provisioned Fleet ({data.devices.length} units)
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-md border border-[#EDF2F7] bg-[#F4F7FA] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
                        <span className="font-mono font-semibold text-[#102A43]">{d.serial}</span>
                      </div>
                      <span className="text-[11px] text-[#627D98]">
                        {d.patient ? (
                          <span className="text-[#334E68] font-medium">{d.patient.name}</span>
                        ) : (
                          <span className="text-[#9FB3C8]">Unassigned</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </Shell>
  );
}

