import { Link, Navigate } from "react-router-dom";
import { useAuth, useCaregiverDashboard } from "../hooks";
import { Shell, Panel, StatusDot } from "../components/ui";
import { greetingFor } from "@/lib/constants";

export function CaregiverDashboardRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { data, loading, error } = useCaregiverDashboard();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8F6] text-xs font-mono uppercase tracking-widest text-[#68717A]">
        Verifying cryptographic session...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

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

          {/* Assigned Patients Table / List */}
          <Panel title="Assigned Patient Directory">
            <div className="divide-y divide-[#D9E2EC]">
              {data.patients.map((row) => (
                <Link
                  key={row.patient.id}
                  to={`/caregiver/patients/${row.patient.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 sm:py-4 transition-all duration-150 hover:bg-[#F4F7FA] rounded-lg min-h-[56px] gap-2"
                >
                  <div className="space-y-1 min-w-0">
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
                  </div>

                  <div className="mt-2 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EDF2F7]">
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

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F7FA] group-hover:bg-[#0D9488] text-[#627D98] group-hover:text-white transition-all duration-200 text-sm">
                      &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </>
      )}
    </Shell>
  );
}
