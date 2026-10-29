import { Link, Navigate } from "react-router-dom";
import { useAuth, useDoctorOverview } from "../hooks";
import { Shell, Panel } from "../components/ui";

export function DoctorOverviewRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rows, loading, error } = useDoctorOverview();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8F6] text-xs font-mono uppercase tracking-widest text-[#68717A]">
        Verifying clinical session...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Shell user={user} onLogout={logout}>
      <section className="mb-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
            Physician Station &middot; Clinical Governance
          </p>
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
          Patient Cohort <span className="text-[#334E68]">Overview</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#627D98] leading-relaxed">
          Authorized clinical records for patient monitoring. Prescription updates and regimen
          modifications require verified physician credentials.
        </p>
      </section>

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Retrieving longitudinal cohort telemetry...
        </div>
      )}

      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r) => (
          <Link key={r.patient.id} to={`/doctor/patients/${r.patient.id}`} className="block group">
            <Panel className="transition-all duration-200 hover:border-[#0D9488]/50 hover:shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-sans text-lg font-bold text-[#102A43] group-hover:text-[#0D9488] transition-colors">
                      {r.patient.name}
                    </h2>
                    <span className="font-mono text-xs text-[#627D98] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded">
                      MRN {r.patient.mrn}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#627D98]">
                    Longitudinal adherence record &middot; Verified clinical care team
                  </p>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 md:gap-8 border-t md:border-t-0 border-[#D9E2EC] pt-4 md:pt-0">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#627D98]">Adherence</dt>
                    <dd className={`mt-0.5 font-sans text-base font-bold ${r.adherence < 80 ? "text-[#D97706]" : "text-[#0D9488]"}`}>
                      {r.adherence}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#627D98]">Missed Doses</dt>
                    <dd className={`mt-0.5 font-sans text-base font-bold ${r.missed > 0 ? "text-[#DC2626]" : "text-[#102A43]"}`}>
                      {r.missed}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#627D98]">Delayed</dt>
                    <dd className="mt-0.5 font-sans text-base font-medium text-[#102A43]">
                      {r.delayed}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#627D98]">Total Events</dt>
                    <dd className="mt-0.5 font-sans text-base font-medium text-[#102A43]">
                      {r.events}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#627D98]">Alerts</dt>
                    <dd className={`mt-0.5 font-sans text-base font-bold ${r.alerts > 0 ? "text-[#D97706]" : "text-[#102A43]"}`}>
                      {r.alerts}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
          </Link>
        ))}

        {rows.length === 0 && !loading && (
          <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-12 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
            No authorized patients currently linked to this physician ID.
          </div>
        )}
      </div>
    </Shell>
  );
}
