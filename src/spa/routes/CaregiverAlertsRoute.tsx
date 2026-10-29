import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useAlerts } from "../hooks";
import { Shell, Panel, PriorityMark } from "../components/ui";

const CHANNEL_ICONS: Record<string, string> = {
  IN_APP: "🔔",
  EMAIL: "📧",
  SMS: "💬",
  PUSH: "📲",
};

function AlertCard({
  alert,
  onAcknowledge,
  canAck,
}: {
  alert: any;
  onAcknowledge: () => void;
  canAck: boolean;
}) {
  const isUrgent = alert.priority === "URGENT";
  const isWarn = alert.priority === "WARNING";

  const borderColor = isUrgent
    ? "#FCA5A5"
    : isWarn
    ? "#FCD34D"
    : "#D9E2EC";
  const bgColor = isUrgent
    ? "#FEF2F2"
    : isWarn
    ? "#FFFBEB"
    : "#FFFFFF";

  return (
    <li
      className="rounded-xl border p-4 transition-all duration-200"
      style={{ borderColor, background: bgColor }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <PriorityMark priority={alert.priority} />
            {alert.acknowledged && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0D9488]">
                ✓ Acknowledged
              </span>
            )}
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#627D98]">
              {alert.category}
            </span>
          </div>
          <div className="text-xs text-[#627D98] mb-1">
            <span className="font-semibold text-[#334E68]">
              {alert.patient?.name ?? "Unknown patient"}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#102A43]">{alert.title}</p>
          {alert.body && (
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-[#627D98] leading-relaxed">
              {alert.body}
            </pre>
          )}
          {alert.createdAt && (
            <p className="mt-2 text-[10px] text-[#9FB3C8] font-mono">
              {new Date(alert.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        {!alert.acknowledged && canAck && (
          <button
            onClick={onAcknowledge}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center flex-shrink-0 rounded-lg border border-[#0D9488] bg-[#FFFFFF] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0D9488] transition-all duration-150 hover:bg-[#0D9488] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          >
            Acknowledge
          </button>
        )}
      </div>
    </li>
  );
}

export function CaregiverAlertsRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const { alerts, notifications, loading, error, acknowledge } = useAlerts();
  const [filter, setFilter] = useState<"ALL" | "URGENT" | "WARNING" | "INFO">("ALL");

  if (authLoading) return <div className="p-8 text-center text-sm text-[#627D98]">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const filtered =
    filter === "ALL"
      ? alerts
      : alerts.filter((a) => a.priority === filter);

  const urgentCount = alerts.filter((a) => a.priority === "URGENT" && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.priority === "WARNING" && !a.acknowledged).length;
  const unackedCount = alerts.filter((a) => !a.acknowledged).length;

  const canAck = user.role !== "DOCTOR";

  return (
    <Shell user={user} onLogout={logout}>
      {/* Page Header */}
      <section className="mb-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
            Clinical Signals &middot; Notification Routing
          </p>
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
          Alerts &amp; <span className="text-[#334E68]">Notifications</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#627D98] leading-relaxed">
          Clinical telemetry signals routed according to verified role and patient assignments.
          Multi-channel audit logs track in-app, email, and push dispatch.
        </p>
      </section>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Alerts", value: alerts.length, color: "#102A43" },
          { label: "Unacknowledged", value: unackedCount, color: unackedCount > 0 ? "#D97706" : "#102A43" },
          { label: "Urgent", value: urgentCount, color: urgentCount > 0 ? "#DC2626" : "#102A43" },
          { label: "Notifications", value: notifications.length, color: "#102A43" },
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

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-lg">
          Loading clinical alerts registry...
        </div>
      )}
      {error && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-medium text-[#DC2626] rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Alerts panel */}
        <div>
          {/* Filter tabs */}
          <div className="mb-4 flex flex-wrap items-center gap-1 border border-[#D9E2EC] bg-[#FFFFFF] rounded-lg p-1 max-w-full">
            {(["ALL", "URGENT", "WARNING", "INFO"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-[44px] px-3.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 flex items-center ${
                  filter === f
                    ? "bg-[#102A43] text-[#FFFFFF]"
                    : "text-[#627D98] hover:text-[#102A43] hover:bg-[#F4F7FA]"
                }`}
              >
                {f}
                {f === "URGENT" && urgentCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white">
                    {urgentCount}
                  </span>
                )}
                {f === "WARNING" && warningCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#D97706] text-[9px] font-bold text-white">
                    {warningCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <ul className="space-y-3">
            {filtered.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onAcknowledge={() => acknowledge(a.id)}
                canAck={canAck}
              />
            ))}
            {filtered.length === 0 && !loading && (
              <li className="border border-[#D9E2EC] bg-[#FFFFFF] p-10 text-center rounded-xl">
                <div className="mb-2 text-3xl">✅</div>
                <p className="text-sm font-medium text-[#102A43]">No alerts</p>
                <p className="mt-1 text-xs text-[#627D98]">
                  {filter === "ALL" ? "All clear — no alerts at this time." : `No ${filter.toLowerCase()} priority alerts.`}
                </p>
              </li>
            )}
          </ul>
        </div>

        {/* Notification log panel */}
        <Panel title="Notification Log">
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">
                    {CHANNEL_ICONS[n.channel] ?? "🔔"}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#627D98]">
                    {n.channel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#102A43] leading-tight">{n.title}</p>
                {n.body && (
                  <p className="mt-1 text-[11px] text-[#627D98] leading-relaxed">{n.body}</p>
                )}
                {(n.createdAt || (n as any).sentAt) && (
                  <p className="mt-1.5 text-[10px] text-[#9FB3C8] font-mono">
                    {new Date(n.createdAt || (n as any).sentAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
            {notifications.length === 0 && !loading && (
              <li className="text-center py-6">
                <p className="text-xs text-[#627D98]">No notifications logged yet.</p>
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}

