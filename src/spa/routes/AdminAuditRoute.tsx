import { Navigate } from "react-router-dom";
import { useAuth, useAdminAudit } from "../hooks";
import { Shell, Panel } from "../components/ui";
import { formatDate, formatTime } from "@/lib/constants";

export function AdminAuditRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { logs, loading, error } = useAdminAudit();

  if (authLoading) return <div className="p-8 text-center text-sm text-muted">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Shell user={user} onLogout={logout}>
      <div className="border-b border-[#D9E2EC] pb-6 mb-8">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#0D9488] font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0D9488]" />
          System Governance · Immutable Records
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-[#102A43]">
              Audit Trail
            </h1>
            <p className="mt-2 text-sm text-[#627D98] max-w-2xl leading-relaxed">
              Chronological ledger of security-critical actions, clinical modifications, and hardware telemetry.
            </p>
          </div>
          <span className="font-mono text-xs px-3 py-1.5 border border-[#D9E2EC] bg-[#FFFFFF] rounded-md text-[#334E68] shadow-sm font-medium">
            {logs.length} Logged Entries
          </span>
        </div>
      </div>

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Loading audit logs...
        </div>
      )}
      {error && (
        <div className="border border-[#DC2626]/30 bg-[#DC2626]/5 p-4 text-xs font-mono text-[#DC2626] rounded-lg">
          {error}
        </div>
      )}

      <Panel className="mt-8 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#D9E2EC] bg-[#F4F7FA] font-sans text-xs font-semibold uppercase tracking-wider text-[#334E68]">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Action &amp; Payload</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]">
              {logs.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-[#F4F7FA]/70 align-top text-xs">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[#627D98]">
                    {formatDate(l.timestamp)} <span className="text-[#9FB3C8]">{formatTime(l.timestamp)}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#102A43]">{l.user?.name ?? "system"}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] px-2 py-0.5 border border-[#D9E2EC] bg-[#F4F7FA] text-[#334E68] rounded">
                      {l.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#334E68]">{l.patient?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#102A43]">{l.action}</span>
                    {l.newValue ? <div className="mt-0.5 font-mono text-[10px] text-[#627D98]">{l.newValue}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                      l.result === "SUCCESS" || l.result === "ALLOWED"
                        ? "border-[#0D9488]/30 bg-[#0D9488]/10 text-[#0D9488] font-semibold"
                        : "border-[#D9E2EC] bg-[#F4F7FA] text-[#627D98]"
                    }`}>
                      {l.result}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#627D98] font-mono">
                    No audit log entries recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}
