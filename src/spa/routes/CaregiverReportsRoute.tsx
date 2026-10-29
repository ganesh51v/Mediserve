import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useReports } from "../hooks";
import { Shell } from "../components/ui";

function AdherenceBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#0D9488" : pct >= 75 ? "#D97706" : "#DC2626";
  const label = pct >= 90 ? "Excellent" : pct >= 75 ? "Fair" : "At Risk";
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-sans text-2xl font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border" style={{ color, background: color + "15", borderColor: color + "40" }}>{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#EDF2F7] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = "#102A43" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="border border-[#D9E2EC] rounded-lg p-3 text-center bg-[#FAFBFC]">
      <div className="font-bold text-lg leading-none" style={{ color }}>{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#627D98]">{label}</div>
    </div>
  );
}

function MeasRow({ type, value, unit, status }: { type: string; value: any; unit: string; status: string }) {
  const ok = status === "NORMAL";
  const warn = status === "WARNING" || status === "ELEVATED" || status === "HIGH";
  const c = ok ? "#0D9488" : warn ? "#D97706" : "#DC2626";
  const bg = ok ? "#F0FDFA" : warn ? "#FFFBEB" : "#FEF2F2";
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F0F4F8] last:border-0">
      <span className="text-xs font-medium text-[#334E68] capitalize">{type.replace(/_/g, " ").toLowerCase()}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[#627D98]">{value} {unit}</span>
        <span className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: c, background: bg, borderColor: c + "40" }}>{status}</span>
      </div>
    </div>
  );
}

export function CaregiverReportsRoute({ title = "Reports" }: { title?: string }) {
  const { user, loading: authLoading, logout } = useAuth();
  const { bundles, loading, error } = useReports();

  if (authLoading) return <div className="p-8 text-center text-sm text-[#627D98]">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Shell user={user} onLogout={logout}>
      <section className="mb-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
            Clinical Registry &middot; Longitudinal Records
          </p>
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
          {title} <span className="text-[#334E68]">&amp; Analytics</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#627D98] leading-relaxed">
          30-day adherence figures, clinical telemetry, and hardware status per patient.
          All figures are factual audit event counts to support clinician oversight.
        </p>
      </section>

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Synthesizing longitudinal clinical reports...
        </div>
      )}
      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {bundles.map(({ patient, report }) => (
          <div key={patient.id} className="border border-[#D9E2EC] rounded-xl bg-[#FFFFFF] shadow-[0_2px_8px_0_rgba(16,42,69,0.06)] overflow-hidden">
            {/* Patient header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EC] bg-[#F4F7FA] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D9488]/10 font-bold text-[#0D9488] text-sm select-none">
                  {patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h2 className="font-sans text-base font-bold text-[#102A43]">{patient.name}</h2>
                  <p className="text-xs text-[#627D98] font-mono">MRN {patient.mrn}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#627D98] bg-[#FFFFFF] border border-[#D9E2EC] px-3 py-1.5 rounded-md">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
                30-Day Clinical Report
              </span>
            </div>

            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D9E2EC]">

              {/* ── Medication adherence column ── */}
              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#627D98] mb-4 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" /> Medication Adherence
                </p>
                <AdherenceBar pct={report.med.ratePct} />
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <MiniStat label="Taken" value={report.med.taken} color="#0D9488" />
                  <MiniStat label="Missed" value={report.med.missed} color={report.med.missed > 0 ? "#DC2626" : "#102A43"} />
                  <MiniStat label="Delayed" value={report.med.delayed} color={report.med.delayed > 0 ? "#D97706" : "#102A43"} />
                  <MiniStat label="Faults" value={report.med.failed} color={report.med.failed > 0 ? "#DC2626" : "#102A43"} />
                </div>

                {report.dispensing.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#627D98] mb-2">Recent Dispenses</p>
                    <ul className="space-y-1.5">
                      {report.dispensing.slice(0, 4).map((ev: any) => (
                        <li key={ev.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F0F4F8] last:border-0">
                          <span className="text-[#334E68] font-medium truncate max-w-[120px]">{ev.plan?.medication?.name || "Medication"}</span>
                          <span className={`font-mono font-bold text-[10px] uppercase ${ev.state === "CONFIRMED" || ev.state === "DISPENSED" ? "text-[#0D9488]" : ev.state === "MISSED" ? "text-[#DC2626]" : "text-[#D97706]"}`}>{ev.state}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── Health observations column ── */}
              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#627D98] mb-4 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" /> Health Observations
                </p>
                {report.measurements.length === 0 ? (
                  <p className="text-xs text-[#627D98] italic">No measurements recorded in period.</p>
                ) : (
                  <div>{report.measurements.slice(0, 8).map((m: any) => <MeasRow key={m.id} type={m.type} value={m.value} unit={m.unit} status={m.status} />)}</div>
                )}

                {report.alerts.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[#EDF2F7]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#627D98] mb-2">Active Alerts ({report.alerts.length})</p>
                    <ul className="space-y-1.5">
                      {report.alerts.slice(0, 3).map((a: any) => (
                        <li key={a.id} className="flex items-start gap-2 rounded-md border border-[#FCD34D]/50 bg-[#FFFBEB] px-2.5 py-1.5">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D97706]" />
                          <span className="text-[11px] text-[#92400E] leading-tight">{a.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.alerts.length === 0 && !loading && (
                  <div className="mt-5 pt-4 border-t border-[#EDF2F7] flex items-center gap-2 text-xs text-[#0D9488]">
                    <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
                    No active alerts
                  </div>
                )}
              </div>

              {/* ── Device / hardware column ── */}
              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#627D98] mb-4 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" /> Dispenser Hardware
                </p>

                {report.device ? (
                  <>
                    <div className="rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] p-4 space-y-2.5">
                      {[
                        ["Serial", <span className="font-mono text-xs font-semibold">{report.device.serial}</span>],
                        ["Status",
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${report.device.online ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0D9488]" : "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${report.device.online ? "bg-[#0D9488]" : "bg-[#DC2626]"}`} />
                            {report.device.online ? "Online" : "Offline"}
                          </span>
                        ],
                        ["Battery",
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 rounded-full bg-[#D9E2EC] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${report.device.batteryPct ?? 0}%`, background: (report.device.batteryPct ?? 0) > 30 ? "#0D9488" : "#DC2626" }} />
                            </div>
                            <span className="font-mono text-xs">{report.device.batteryPct ?? 0}%</span>
                          </div>
                        ],
                        ["Telemetry", <span className="font-mono text-xs">{report.device.telemetry?.length ?? 0} samples</span>],
                        ["Dispense events", <span className="font-mono text-xs">{report.dispensing.length}</span>],
                      ].map(([label, content], i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-[#627D98]">{label as string}</span>
                          <span>{content as React.ReactNode}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <MiniStat label="Total Events" value={report.med.total ?? 0} />
                      <MiniStat label="30-Day Rate" value={`${report.med.ratePct}%`} color={report.med.ratePct >= 80 ? "#0D9488" : report.med.ratePct >= 70 ? "#D97706" : "#DC2626"} />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] p-8 text-center">
                    <svg className="mx-auto mb-2 h-8 w-8 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                    <p className="text-xs text-[#627D98]">No dispenser assigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {bundles.length === 0 && !loading && (
          <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-12 text-center rounded-xl">
            <svg className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-[#102A43]">No patient reports found</p>
            <p className="mt-1 text-xs text-[#627D98]">Reports appear once patients are assigned to your care team.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}


