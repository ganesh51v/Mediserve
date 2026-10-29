import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";

export function Shell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const links =
    user.role === "ADMIN"
      ? [
          ["/admin", "Directory"],
          ["/admin/devices", "Devices"],
          ["/admin/audit", "Audit"],
          ["/simulator", "Simulator"],
        ]
      : user.role === "DOCTOR"
        ? [
            ["/doctor", "Patients"],
            ["/doctor/alerts", "Alerts"],
            ["/doctor/reports", "Reports"],
          ]
        : [
            ["/caregiver", "Patients"],
            ["/caregiver/alerts", "Alerts"],
            ["/caregiver/reports", "Reports"],
            ["/simulator", "Simulator"],
          ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43]">
      <header className="border-b border-[#D9E2EC] bg-[#FFFFFF] shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase font-bold text-[#0D9488]">MediServe</p>
            <p className="text-sm text-[#627D98]">Monitoring support, not autonomous clinical decisions</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="text-[#334E68] hover:text-[#0D9488] font-medium transition-colors">
                {label}
              </Link>
            ))}
            <span className="text-xs bg-[#F4F7FA] border border-[#D9E2EC] px-2.5 py-1 rounded text-[#627D98]">
              {user.name} · <strong className="text-[#0D9488]">{user.role}</strong>
            </span>
            <form action={logoutAction}>
              <button className="border border-[#D9E2EC] bg-white px-3 py-1 text-xs font-medium text-[#102A43] hover:bg-[#F4F7FA] rounded transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

export function StatusDot({ attention }: { attention: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: attention ? "#D97706" : "#0D9488" }}
      />
      <span className={attention ? "text-[#D97706] font-semibold" : "text-[#0D9488] font-semibold"}>
        {attention ? "Attention" : "Normal"}
      </span>
    </span>
  );
}

export function PriorityMark({ priority }: { priority: string }) {
  const color = priority === "URGENT" ? "#DC2626" : priority === "WARNING" ? "#D97706" : "#0D9488";
  return (
    <span className="text-xs font-semibold tracking-wide" style={{ color }}>
      {priority}
    </span>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[#D9E2EC] bg-[#FFFFFF] p-5 rounded-lg shadow-xs ${className}`}>
      {title ? <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#102A43] uppercase">{title}</h2> : null}
      {children}
    </section>
  );
}

export { OledSimulatorPanel, STATES } from "@/spa/components/ui";

