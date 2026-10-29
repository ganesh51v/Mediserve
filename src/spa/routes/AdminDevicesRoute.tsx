import { Navigate } from "react-router-dom";
import { useAuth, useAdminDevices } from "../hooks";
import { Shell } from "../components/ui";

export function AdminDevicesRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { devices, loading, error } = useAdminDevices();

  if (authLoading) return <div className="p-8 text-center text-sm text-[#627D98]">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const onlineCount = devices.filter((d) => d.online).length;
  const faultCount = devices.filter((d) => !d.online || d.simState === "JAMMED" || d.simState === "SENSOR_ERROR").length;
  const lowBattCount = devices.filter((d) => (d.batteryPct ?? 100) < 25).length;

  return (
    <Shell user={user} onLogout={logout}>
      <div className="border-b border-[#D9E2EC] pb-6 mb-8">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#0D9488] font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0D9488]" />
          Hardware Fleet &middot; Telemetry &amp; Provisioning
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-[#102A43]">
              Dispensary Units
            </h1>
            <p className="mt-2 text-sm text-[#627D98] max-w-2xl leading-relaxed">
              Real-time connectivity status, battery levels, and firmware posture across all provisioned hardware.
            </p>
          </div>
          <span className="font-mono text-xs px-3 py-1.5 border border-[#D9E2EC] bg-[#FFFFFF] rounded-md text-[#334E68] shadow-sm font-medium">
            {devices.length} Units Deployed
          </span>
        </div>
      </div>

      {/* Fleet summary stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Devices", value: devices.length, color: "#102A43" },
          { label: "Online", value: onlineCount, color: "#0D9488" },
          { label: "Faults / Offline", value: faultCount, color: faultCount > 0 ? "#DC2626" : "#102A43" },
          { label: "Low Battery", value: lowBattCount, color: lowBattCount > 0 ? "#D97706" : "#102A43" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-[#D9E2EC] bg-[#FFFFFF] rounded-lg p-4 text-center shadow-[0_1px_3px_0_rgba(16,42,69,0.04)]">
            <div className="font-sans text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#627D98]">{label}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Loading hardware fleet...
        </div>
      )}
      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => {
          const battPct = d.batteryPct ?? 100;
          const battColor = battPct > 50 ? "#0D9488" : battPct > 25 ? "#D97706" : "#DC2626";
          const hasFault = d.simState === "JAMMED" || d.simState === "SENSOR_ERROR";

          return (
            <div
              key={d.id}
              className={`border rounded-xl bg-[#FFFFFF] p-5 shadow-[0_1px_3px_0_rgba(16,42,69,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_0_rgba(16,42,69,0.10)] ${
                hasFault
                  ? "border-[#FCA5A5]"
                  : d.online
                  ? "border-[#D9E2EC] hover:border-[#0D9488]/50"
                  : "border-[#E2E8F0]"
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono text-sm font-bold text-[#102A43]">{d.serial}</div>
                  <div className="mt-0.5 text-[10px] font-mono text-[#627D98] uppercase tracking-wider">
                    v{d.firmware}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    hasFault
                      ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]"
                      : d.online
                      ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0D9488]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] text-[#627D98]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasFault ? "bg-[#DC2626]" : d.online ? "bg-[#0D9488] animate-pulse" : "bg-[#627D98]"
                    }`}
                  />
                  {hasFault ? d.simState : d.online ? "Online" : "Offline"}
                </span>
              </div>

              {/* Patient assignment */}
              <div className="rounded-md border border-[#EDF2F7] bg-[#F4F7FA] px-3 py-2 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[#627D98] mb-0.5">Assigned Patient</div>
                <div className="text-xs font-semibold text-[#102A43]">
                  {d.patient?.name ?? (
                    <span className="text-[#CBD5E1] font-normal">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Battery bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#627D98]">Battery</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: battColor }}>{battPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#EDF2F7] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${battPct}%`, background: battColor }}
                  />
                </div>
              </div>

              {/* State */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-[#EDF2F7]">
                <span className="text-[#627D98]">SIM State</span>
                <span className="font-mono text-[10px] font-semibold text-[#334E68] uppercase">{d.simState}</span>
              </div>
            </div>
          );
        })}

        {devices.length === 0 && !loading && (
          <div className="col-span-3 border border-[#D9E2EC] bg-[#FFFFFF] rounded-xl p-12 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            <p className="text-sm font-medium text-[#102A43]">No dispensary units registered</p>
            <p className="mt-1 text-xs text-[#627D98]">Register devices from the Directory page.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

