import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { SessionUser, Device, MedicationEvent } from "../types";
import { promptPwaInstall } from "../../pwa";

export function Shell({
  user,
  onLogout,
  children,
}: {
  user: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [canInstall, setCanInstall] = React.useState(false);

  // Monitor online / offline network status
  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Monitor PWA install availability
  React.useEffect(() => {
    const handleInstallable = () => setCanInstall(true);
    window.addEventListener("pwa-installable", handleInstallable);
    return () => window.removeEventListener("pwa-installable", handleInstallable);
  }, []);

  const handleInstallClick = async () => {
    const accepted = await promptPwaInstall();
    if (accepted) setCanInstall(false);
  };

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const links =
    user.role === "ADMIN"
      ? [
          ["/admin", "Directory"],
          ["/admin/devices", "Devices"],
          ["/admin/audit", "Audit Log"],
          ["/simulator", "Simulator"],
        ]
      : user.role === "DOCTOR"
        ? [
            ["/doctor", "Patients"],
            ["/doctor/alerts", "Alerts Feed"],
            ["/doctor/reports", "Clinical Reports"],
          ]
        : [
            ["/caregiver", "Patients"],
            ["/caregiver/alerts", "Alerts Feed"],
            ["/caregiver/reports", "Reports"],
            ["/simulator", "Simulator"],
          ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA] text-[#102A43] selection:bg-[#0D9488] selection:text-[#FFFFFF]">
      {/* Responsive Medical Tech Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[#D9E2EC] bg-[#FFFFFF]/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(16,42,69,0.06)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="group flex items-center gap-2.5 min-h-[44px]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488] text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="font-sans text-base font-bold tracking-tight text-[#102A43] leading-tight">
                  MediServe
                </span>
                <span className="hidden font-sans text-[10px] text-[#627D98] sm:inline-block leading-tight">
                  Precision Healthcare Systems
                </span>
              </div>
            </Link>

            {/* Offline PWA Indicator Badge */}
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D97706] bg-[#FFFBEB] border border-[#FCD34D] px-2 py-0.5 rounded-md">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] animate-pulse" />
                Offline
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-3 lg:gap-5 text-sm">
            <nav className="flex items-center gap-1">
              {links.map(([href, label]) => {
                const isActive = location.pathname === href;
                return (
                  <Link
                    key={href}
                    to={href}
                    className={`min-h-[44px] flex items-center px-3 py-2 text-xs font-semibold rounded-md transition-colors duration-150 ${
                      isActive
                        ? "bg-[#F0FDFA] text-[#0D9488]"
                        : "text-[#334E68] hover:text-[#0D9488] hover:bg-[#F4F7FA]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* PWA Install Button (Desktop) */}
            {canInstall && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0D9488] bg-[#F0FDFA] border border-[#99F6E4] rounded-md hover:bg-[#CCFBF1] transition-colors shadow-2xs"
                title="Install MediServe as a desktop or mobile application"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}

            <div className="h-4 w-px bg-[#D9E2EC]" />

            {/* User Session Chip */}
            <div className="flex items-center gap-2 text-xs bg-[#F4F7FA] border border-[#D9E2EC] px-3 py-1.5 rounded-md">
              <span className="font-mono font-bold text-[#0D9488] uppercase tracking-wider text-[10px]">
                {user.role}
              </span>
              <span className="text-[#CBD5E1]">&middot;</span>
              <span className="truncate max-w-[140px] font-medium text-[#102A43]">{user.name}</span>
            </div>

            <button
              onClick={onLogout}
              className="min-h-[44px] border border-[#D9E2EC] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#102A43] transition-all duration-150 hover:bg-[#F4F7FA] hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none rounded-md flex items-center"
            >
              Sign out
            </button>
          </div>

          {/* Mobile Actions: Install + Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex h-11 items-center gap-1 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-2.5 text-xs font-semibold text-[#0D9488]"
                title="Install App"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D9E2EC] bg-[#FFFFFF] text-[#102A43] hover:bg-[#F4F7FA] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#D9E2EC] bg-[#FFFFFF] px-4 pt-3 pb-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Mobile User Profile Banner */}
            <div className="mb-3 flex items-center justify-between rounded-lg border border-[#EDF2F7] bg-[#F4F7FA] p-3 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-[#102A43] truncate">{user.name}</div>
                <div className="text-[10px] text-[#627D98] truncate">{user.email}</div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0D9488] bg-[#F0FDFA] border border-[#99F6E4] px-2 py-0.5 rounded">
                {user.role}
              </span>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="space-y-1 mb-4">
              {links.map(([href, label]) => {
                const isActive = location.pathname === href;
                return (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? "bg-[#F0FDFA] text-[#0D9488]"
                        : "text-[#334E68] hover:bg-[#F4F7FA] hover:text-[#102A43]"
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && <span className="h-2 w-2 rounded-full bg-[#0D9488]" />}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Sign Out Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="flex w-full min-h-[44px] items-center justify-center rounded-lg border border-[#D9E2EC] bg-[#FFFFFF] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] transition-colors"
            >
              Sign out of Station
            </button>
          </div>
        )}
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-3.5 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
        {children}
      </main>

      {/* Responsive Clinical Footer */}
      <footer className="mt-auto border-t border-[#D9E2EC] bg-[#FFFFFF] py-6 text-xs text-[#627D98]">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
            <span className="font-semibold text-[#102A43]">MediServe Systems</span>
            <span className="text-[#CBD5E1]">&middot;</span>
            <span>Clinical Monitoring &middot; Hardware Governance</span>
          </div>
          <div className="text-[11px] text-[#627D98]">
            Connected securely to clinical gateway &middot; All records audited
          </div>
        </div>
      </footer>
    </div>
  );
}

export function StatusDot({ attention }: { attention: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ background: attention ? "#D97706" : "#0D9488" }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ background: attention ? "#D97706" : "#0D9488" }}
        />
      </span>
      <span className={attention ? "text-[#D97706] font-semibold" : "text-[#0D9488] font-semibold"}>
        {attention ? "Attention" : "Normal"}
      </span>
    </span>
  );
}

export function PriorityMark({ priority }: { priority: string }) {
  const isUrgent = priority === "URGENT";
  const isWarn = priority === "WARNING";

  const colorStyle = isUrgent
    ? "text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]"
    : isWarn
      ? "text-[#D97706] bg-[#FFFBEB] border-[#FCD34D]"
      : "text-[#0D9488] bg-[#F0FDFA] border-[#99F6E4]";

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase rounded-md ${colorStyle}`}
    >
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
    <section
      className={`border border-[#D9E2EC] bg-[#FFFFFF] p-4 sm:p-6 rounded-xl shadow-[0_1px_3px_0_rgba(16,42,69,0.04)] transition-all duration-200 hover:border-[#CBD5E1] hover:shadow-[0_2px_6px_0_rgba(16,42,69,0.08)] ${className}`}
    >
      {title ? (
        <div className="mb-4 flex items-center justify-between border-b border-[#D9E2EC]/80 pb-3">
          <h2 className="font-sans text-sm font-semibold tracking-wide text-[#102A43] uppercase flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
            {title}
          </h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export const STATES = [
  "ONLINE",
  "OFFLINE",
  "READY",
  "DISPENSING",
  "DISPENSED",
  "JAMMED",
  "LOW_STOCK",
  "LOW_BATTERY",
  "SENSOR_ERROR",
];

export function OledSimulatorPanel({
  device,
  due,
  messages,
  onSetState,
  onTick,
  onConfirm,
  onTriggerDose,
  onRefill,
  onSetBattery,
}: {
  device: Device;
  due?: MedicationEvent;
  messages: Array<{ topic: string; payload: string; timestamp?: any }>;
  onSetState: (state: string) => void;
  onTick: () => void;
  onConfirm: () => void;
  onTriggerDose?: () => void;
  onRefill?: () => void;
  onSetBattery?: (batteryPct: number) => void;
}) {
  const [clock, setClock] = React.useState<string>("");
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(false);
  const [activeSlot, setActiveSlot] = React.useState<number>(1);
  const [isPressingConfirm, setIsPressingConfirm] = React.useState<boolean>(false);
  const [mqttFilter, setMqttFilter] = React.useState<string>("ALL");
  const [copied, setCopied] = React.useState<boolean>(false);
  const [localBattery, setLocalBattery] = React.useState<number>(device.batteryPct ?? 88);
  const [clearedLogs, setClearedLogs] = React.useState<boolean>(false);

  // Sync battery state
  React.useEffect(() => {
    if (device.batteryPct !== undefined) {
      setLocalBattery(device.batteryPct);
    }
  }, [device.batteryPct]);

  // Real-time OLED clock
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Piezo buzzer beep generator (2.4kHz medical device frequency)
  const playBeep = React.useCallback(
    (freq = 2400, duration = 0.18) => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // AudioContext might require user gesture
      }
    },
    [soundEnabled]
  );

  // Periodic alarm beeper when medication is due
  React.useEffect(() => {
    if (!due || !soundEnabled) return;
    const interval = setInterval(() => {
      playBeep(2400, 0.12);
      setTimeout(() => playBeep(2800, 0.12), 150);
    }, 2500);
    return () => clearInterval(interval);
  }, [due, soundEnabled, playBeep]);

  const handleManualConfirm = async () => {
    setIsPressingConfirm(true);
    playBeep(1800, 0.1);
    try {
      await onConfirm();
    } finally {
      setTimeout(() => setIsPressingConfirm(false), 300);
    }
  };

  const handleManualTick = () => {
    setActiveSlot((prev) => (prev % 4) + 1);
    playBeep(800, 0.15);
    onTick();
  };

  const handleStepMotor = () => {
    setActiveSlot((prev) => (prev % 4) + 1);
    playBeep(600, 0.12);
  };

  const handleBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalBattery(val);
    if (onSetBattery) {
      onSetBattery(val);
    }
  };

  // Chamber inventory slots
  const rawSlots: any[] = (device as any).slots || [];
  const slots: Array<{
    slot: number;
    pills: number;
    status: string;
    medicineName: string;
  }> =
    rawSlots.length > 0
      ? rawSlots.map((s: any, idx: number) => ({
          slot: s.slotIndex ?? s.slot ?? idx + 1,
          pills: s.count ?? s.pills ?? 14,
          status: s.stock ?? s.status ?? "GOOD",
          medicineName:
            s.medicationName ??
            s.medicineName ??
            `Slot ${s.slotIndex ?? idx + 1} Medication`,
        }))
      : [
          { slot: 1, pills: 14, status: "GOOD", medicineName: "Metformin 500mg" },
          { slot: 2, pills: 14, status: "GOOD", medicineName: "Lisinopril 10mg" },
          { slot: 3, pills: 14, status: "GOOD", medicineName: "Atorvastatin 20mg" },
          { slot: 4, pills: 14, status: "GOOD", medicineName: "Aspirin 81mg" },
        ];

  // LED state calculation
  const isJammed = device.simState === "JAMMED";
  const isFault =
    isJammed ||
    device.simState === "LOW_BATTERY" ||
    device.simState === "SENSOR_ERROR";
  const isDispensing = device.simState === "DISPENSING";
  const isDispensed = device.simState === "DISPENSED";
  const isOffline = !device.online || device.simState === "OFFLINE";

  let ledStatus: { color: string; label: string; glow: string; pulse: boolean } =
    {
      color: "bg-emerald-400",
      label: "SOLID GREEN (READY)",
      glow: "shadow-[0_0_12px_#34D399]",
      pulse: false,
    };

  if (isOffline) {
    ledStatus = {
      color: "bg-slate-600",
      label: "DARK (OFFLINE)",
      glow: "shadow-none",
      pulse: false,
    };
  } else if (isFault) {
    ledStatus = {
      color: "bg-rose-500",
      label: "FLASHING RED (FAULT)",
      glow: "shadow-[0_0_16px_#EF4444]",
      pulse: true,
    };
  } else if (due || isDispensing || isDispensed) {
    ledStatus = {
      color: "bg-amber-400",
      label: "PULSING AMBER (DOSE DUE)",
      glow: "shadow-[0_0_16px_#F59E0B]",
      pulse: true,
    };
  }

  // MQTT Messages filtering
  const displayMessages = clearedLogs
    ? []
    : messages.filter((m) => {
        if (mqttFilter === "ALL") return true;
        if (mqttFilter === "TELEMETRY") return m.topic.includes("/telemetry");
        if (mqttFilter === "DISPENSE") return m.topic.includes("/dispense");
        if (mqttFilter === "CONFIRM") return m.topic.includes("/confirm");
        if (mqttFilter === "ALERT") return m.topic.includes("/alert");
        return true;
      });

  const handleCopyLogs = () => {
    const text = displayMessages
      .map((m) => `[${m.topic}] ${m.payload}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel title={`Dispensary Hardware Unit · ${device.serial}`}>
      <div className="grid gap-6 sm:gap-8 xl:grid-cols-[400px_1fr]">
        {/* ============================================================== */}
        {/* COLUMN 1: PHYSICAL HARDWARE ENCLOSURE (OLED + LED + BUZZER)   */}
        {/* ============================================================== */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Hardware Enclosure Chassis */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-linear-to-b from-slate-900 via-[#0B132B] to-[#0A0E1A] p-3.5 sm:p-5 shadow-2xl ring-1 ring-white/10">
            {/* Top Screws & Branding */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-cyan-400">
                  MEDISERVE ESP32-S3
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span>FW v2.4.1</span>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />
              </div>
            </div>

            {/* SSD1306 128x64 OLED Screen Bezel */}
            <div className="mt-3.5 rounded-xl border-4 border-slate-800 bg-black p-2.5 sm:p-3.5 shadow-inner">
              {/* OLED Glass Viewport */}
              <div className="relative rounded-lg bg-[#020617] p-2.5 sm:p-3 font-mono text-cyan-400 border border-cyan-950/60 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] min-h-[160px] flex flex-col justify-between overflow-hidden">
                {/* OLED Status Bar */}
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-1.5 text-[10px] text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    {/* WiFi Signal Bars */}
                    <div className="flex items-end gap-0.5 h-2.5">
                      <span className={`w-0.5 h-1 ${!isOffline ? "bg-cyan-400" : "bg-slate-700"}`} />
                      <span className={`w-0.5 h-1.5 ${!isOffline ? "bg-cyan-400" : "bg-slate-700"}`} />
                      <span className={`w-0.5 h-2 ${!isOffline ? "bg-cyan-400" : "bg-slate-700"}`} />
                      <span className={`w-0.5 h-2.5 ${!isOffline ? "bg-cyan-400" : "bg-slate-700"}`} />
                    </div>
                    <span className="text-[9px] opacity-80">{!isOffline ? "MQTT OK" : "NO NET"}</span>
                  </div>

                  <div className="text-[11px] font-bold tracking-wider text-cyan-200">
                    {clock || "00:00:00"}
                  </div>

                  <div className="flex items-center gap-1 text-[9px]">
                    <span className="opacity-80">{localBattery}%</span>
                    <div className="w-4 h-2 border border-cyan-400/80 rounded-xs p-0.5 flex items-center">
                      <div
                        className={`h-full ${
                          localBattery <= 15
                            ? "bg-rose-500"
                            : localBattery <= 35
                              ? "bg-amber-400"
                              : "bg-cyan-400"
                        }`}
                        style={{ width: `${Math.max(10, Math.min(100, localBattery))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* OLED Content Body */}
                <div className="py-2.5 text-xs flex-1 flex flex-col justify-center">
                  {due ? (
                    <div className="space-y-1.5">
                      <div className="bg-amber-400 text-black px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-center rounded-xs animate-pulse">
                        ▲ MEDICATION DUE ▲
                      </div>
                      <div className="text-sm font-bold text-white tracking-wide truncate">
                        {due.plan?.medication?.name || (due as any).medicineName || "Scheduled Medication"}
                      </div>
                      <div className="text-[11px] text-cyan-200 flex items-center justify-between">
                        <span>Dose: {due.plan?.dosage || "1 Tablet"}</span>
                        <span className="text-amber-300 font-bold">Chamber #{activeSlot}</span>
                      </div>
                      <div className="border-t border-cyan-900/50 pt-1 text-[9px] text-amber-200 uppercase tracking-wider font-semibold animate-pulse">
                        &gt; TAKE PILL &bull; PRESS CONFIRM
                      </div>
                    </div>
                  ) : isJammed ? (
                    <div className="space-y-1 text-rose-400 text-center">
                      <div className="bg-rose-500 text-white px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs">
                        ✖ HARDWARE FAULT ✖
                      </div>
                      <div className="text-xs font-bold text-white pt-1">
                        CAROUSEL MOTOR JAMMED
                      </div>
                      <div className="text-[10px] text-rose-300">
                        Chute obstructed at Slot #{activeSlot}
                      </div>
                      <div className="text-[9px] text-slate-400 pt-0.5">
                        Alert sent to Caregiver feed
                      </div>
                    </div>
                  ) : device.simState === "LOW_BATTERY" ? (
                    <div className="space-y-1 text-amber-300 text-center">
                      <div className="bg-amber-400 text-black px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs">
                        ⚠ LOW BATTERY WARNING ⚠
                      </div>
                      <div className="text-xs font-bold text-white pt-1">
                        Capacity: {localBattery}% (&lt;15%)
                      </div>
                      <div className="text-[10px] text-amber-200">
                        Please attach 5V USB-C power
                      </div>
                    </div>
                  ) : device.simState === "SENSOR_ERROR" ? (
                    <div className="space-y-1 text-amber-300 text-center">
                      <div className="bg-amber-400 text-black px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs">
                        ⚠ IR DROP SENSOR ERROR ⚠
                      </div>
                      <div className="text-xs font-bold text-white pt-1">
                        Optical Beam Blocked / Dirty
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Clean dispenser chute sensor
                      </div>
                    </div>
                  ) : isDispensing ? (
                    <div className="space-y-1.5 text-center">
                      <div className="text-cyan-300 font-bold text-xs uppercase animate-pulse">
                        ⚙ MOTOR ROTATING ⚙
                      </div>
                      <div className="text-[11px] text-white">
                        Advancing Slot #{activeSlot} to chute...
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 animate-pulse w-3/4" />
                      </div>
                    </div>
                  ) : isDispensed ? (
                    <div className="space-y-1.5 text-center">
                      <div className="bg-cyan-500 text-black px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs">
                        ✓ PILL DISPENSED TO TRAY
                      </div>
                      <div className="text-xs font-bold text-white">
                        Awaiting Ingestion Confirmation
                      </div>
                      <div className="text-[9px] text-cyan-200">
                        Press physical front panel button
                      </div>
                    </div>
                  ) : isOffline ? (
                    <div className="space-y-1 text-center text-slate-400">
                      <div className="bg-slate-700 text-white px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs">
                        DISCONNECTED
                      </div>
                      <div className="text-xs font-bold text-slate-300 pt-1">
                        UNIT OFFLINE
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Reconnecting WiFi / Broker...
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-cyan-300">
                        SYSTEM STANDBY &bull; ONLINE
                      </div>
                      <div className="text-sm font-semibold text-white truncate">
                        {device.patient?.name ? `Patient: ${device.patient.name}` : "Patient: Unassigned"}
                      </div>
                      <div className="text-[10px] text-cyan-400/80">
                        Active Slot: Chamber #{activeSlot}
                      </div>
                      <div className="text-[9px] text-slate-400 pt-1">
                        All sensors calibrated &bull; NTP locked
                      </div>
                    </div>
                  )}
                </div>

                {/* OLED Footer */}
                <div className="border-t border-cyan-900/40 pt-1 text-[8px] flex items-center justify-between text-cyan-500 font-mono">
                  <span>SSD1306 128x64</span>
                  <span>Free Heap: 184 KB</span>
                </div>
              </div>
            </div>

            {/* Hardware Signaling: Dual-Color LED & Piezo Buzzer */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs">
              {/* LED Lens */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`h-4 w-4 rounded-full border border-white/20 transition-all duration-300 ${
                      ledStatus.color
                    } ${ledStatus.glow} ${ledStatus.pulse ? "animate-pulse" : ""}`}
                  />
                  {ledStatus.pulse && (
                    <span
                      className={`absolute h-6 w-6 rounded-full opacity-40 animate-ping ${ledStatus.color}`}
                    />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Dual-Color LED
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">
                    {due ? "AMBER" : isFault ? "RED" : isOffline ? "OFF" : "GREEN"}
                  </div>
                </div>
              </div>

              {/* Buzzer Indicator & Audio Toggle */}
              <div className="flex items-center justify-between border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <span>Piezo Buzzer</span>
                    {due && (
                      <span className="flex gap-0.5 items-center">
                        <span className="h-1.5 w-0.5 bg-amber-400 animate-pulse" />
                        <span className="h-2.5 w-0.5 bg-amber-400 animate-pulse" />
                        <span className="h-3.5 w-0.5 bg-amber-400 animate-pulse" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">
                    {due ? "ACTIVE (2.4kHz)" : "STANDBY"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playBeep(2400, 0.1);
                  }}
                  title={soundEnabled ? "Mute Web Audio Buzzer" : "Enable Web Audio Buzzer"}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border text-sm transition-colors ${
                    soundEnabled
                      ? "border-cyan-500 bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {soundEnabled ? "🔊" : "🔇"}
                </button>
              </div>
            </div>

            {/* Tactile Patient Confirm Button */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
                Physical Push Button (Patient Ingestion Verification)
              </p>
              <button
                type="button"
                onClick={handleManualConfirm}
                className={`w-full min-h-[48px] py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all duration-150 border-2 shadow-lg flex items-center justify-center gap-2 ${
                  isPressingConfirm
                    ? "translate-y-1 bg-cyan-700 border-cyan-400 text-white shadow-inner scale-[0.98]"
                    : due
                      ? "bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border-amber-300 text-slate-950 shadow-amber-500/30 animate-pulse"
                      : "bg-linear-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 border-cyan-400 text-white shadow-cyan-600/20"
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-white/80 shadow-xs" />
                {due ? "PUSH BUTTON TO CONFIRM INGESTION" : "PHYSICAL CONFIRM BUTTON"}
              </button>
              <p className="text-[9px] text-slate-500 mt-1.5 italic">
                Safety Rule: Dispensing opens chamber, but physical button verifies ingestion.
              </p>
            </div>
          </div>

          {/* Rotary Carousel Compartment Inventory */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="text-teal-600 font-mono">4-Slot</span> Carousel Inventory
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleStepMotor}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center"
                  title="Manually step stepper motor 90 degrees"
                >
                  Step 90° ↻
                </button>
                {onRefill && (
                  <button
                    type="button"
                    onClick={onRefill}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors flex items-center"
                    title="Refill all 4 chambers to 14 tablets"
                  >
                    Refill 💊
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slots.map((s) => {
                const isActive = s.slot === activeSlot;
                return (
                  <div
                    key={s.slot}
                    className={`p-2.5 rounded-xl border transition-all text-xs ${
                      isActive
                        ? "border-teal-500 bg-teal-50/70 shadow-xs ring-1 ring-teal-500/30"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] text-slate-900 flex items-center gap-1">
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
                        Slot #{s.slot}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-semibold ${
                          s.pills <= 3
                            ? "bg-rose-100 text-rose-700"
                            : s.pills <= 6
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {s.pills} pills
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-700 truncate mt-1">
                      {s.medicineName}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {isActive ? "Aligned with chute ▼" : "Chamber ready"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: CONTROL DECK & LIVE MQTT GATEWAY TELEMETRY FEED      */}
        {/* ============================================================== */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Top Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Patient
              </p>
              <h3 className="text-base font-bold text-slate-900">
                {device.patient?.name ?? "No Patient Assigned"}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs text-slate-600">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
                State: <strong className="text-slate-900">{device.simState}</strong>
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
                Battery: <strong className="text-slate-900">{localBattery}%</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Microcontroller Hardware Triggers
            </p>
            <div className="flex flex-wrap gap-2.5">
              {onTriggerDose && (
                <button
                  type="button"
                  onClick={onTriggerDose}
                  className="min-h-[44px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 text-xs uppercase tracking-wider rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>⚡</span> Trigger Dose Now
                </button>
              )}
              <button
                type="button"
                onClick={handleManualTick}
                className="min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3.5 py-2 text-xs uppercase tracking-wider rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>🔄</span> Dispense Cycle (Tick)
              </button>
              <button
                type="button"
                onClick={handleManualConfirm}
                className="min-h-[44px] border-2 border-slate-800 bg-white hover:bg-slate-50 text-slate-900 font-semibold px-3.5 py-2 text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>🔘</span> Confirm Button
              </button>
              {onRefill && (
                <button
                  type="button"
                  onClick={onRefill}
                  className="min-h-[44px] border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-3.5 py-2 text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>💊</span> Refill Slots
                </button>
              )}
            </div>

            {/* Battery Level Slider */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  Simulated Li-Po Battery Level
                </span>
                <span className="font-mono font-bold text-teal-700">
                  {localBattery}% ({localBattery <= 15 ? "CRITICAL" : localBattery <= 35 ? "LOW" : "NORMAL"})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localBattery}
                onChange={handleBatteryChange}
                className="w-full accent-teal-600 cursor-pointer h-7"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>0% (Empty)</span>
                <span>15% (Threshold)</span>
                <span>50%</span>
                <span>100% (Full)</span>
              </div>
            </div>
          </div>

          {/* Telemetry Fault Injection Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between mb-2 gap-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Fault &amp; Diagnostic State Injection
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                Updates Caregiver &amp; Doctor feeds in real time
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATES.map((s) => {
                const isSelected = device.simState === s;
                let btnStyle =
                  "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";
                if (isSelected) {
                  if (s === "JAMMED" || s === "SENSOR_ERROR") {
                    btnStyle = "border-rose-600 bg-rose-600 text-white shadow-xs";
                  } else if (s === "LOW_BATTERY" || s === "LOW_STOCK") {
                    btnStyle = "border-amber-600 bg-amber-600 text-white shadow-xs";
                  } else {
                    btnStyle = "border-teal-600 bg-teal-600 text-white shadow-xs";
                  }
                }
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSetState(s)}
                    className={`min-h-[40px] border px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all flex items-center justify-center ${btnStyle}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Gateway MQTT Telemetry Protocol Inspector */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-4 shadow-lg text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  Gateway MQTT Telemetry Feed
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({displayMessages.length} msgs)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="min-h-[38px] px-3 py-1 text-xs font-mono rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setClearedLogs(!clearedLogs)}
                  className="min-h-[38px] px-3 py-1 text-xs font-mono rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center"
                >
                  {clearedLogs ? "Restore" : "Clear"}
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px] font-mono">
              {["ALL", "TELEMETRY", "DISPENSE", "CONFIRM", "ALERT"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMqttFilter(tab);
                    setClearedLogs(false);
                  }}
                  className={`min-h-[36px] px-2.5 py-1 rounded-sm transition-colors flex items-center ${
                    mqttFilter === tab
                      ? "bg-cyan-500 text-black font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="mt-3 max-h-56 overflow-y-auto space-y-2 font-mono text-[11px] pr-1">
              {displayMessages.length > 0 ? (
                displayMessages.map((m, idx) => {
                  let tagColor = "text-cyan-400 border-cyan-800 bg-cyan-950/60";
                  if (m.topic.includes("/alert")) {
                    tagColor = "text-rose-400 border-rose-800 bg-rose-950/60";
                  } else if (m.topic.includes("/confirm")) {
                    tagColor = "text-emerald-400 border-emerald-800 bg-emerald-950/60";
                  } else if (m.topic.includes("/dispense")) {
                    tagColor = "text-amber-400 border-amber-800 bg-amber-950/60";
                  }

                  let prettyPayload = m.payload;
                  try {
                    const parsed = JSON.parse(m.payload);
                    prettyPayload = JSON.stringify(parsed, null, 2);
                  } catch {
                    // Raw string
                  }

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 border-b border-slate-800/60 pb-1">
                        <span className={`px-1.5 py-0.2 rounded-xs border text-[9px] font-bold ${tagColor}`}>
                          {m.topic}
                        </span>
                        <span className="text-slate-500">QoS 1</span>
                      </div>
                      <pre className="text-cyan-300 text-[10px] whitespace-pre-wrap break-all leading-tight">
                        {prettyPayload}
                      </pre>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No telemetry packets matching current filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
