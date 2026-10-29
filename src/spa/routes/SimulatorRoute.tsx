import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useSimulator } from "../hooks";
import { Shell, OledSimulatorPanel } from "../components/ui";

export function SimulatorRoute() {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    devices,
    pending,
    messagesByDevice,
    loading,
    error,
    tick,
    setState,
    confirm,
    triggerDose,
    refill,
    setBattery,
  } = useSimulator();
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>("ALL");

  if (authLoading) return <div className="p-8 text-center text-sm text-muted">Checking authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const filteredDevices =
    selectedDeviceId === "ALL"
      ? devices
      : devices.filter((d) => d.id === selectedDeviceId);

  return (
    <Shell user={user} onLogout={logout}>
      <section className="mb-6 max-w-5xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
            Physical Hardware &middot; ESP32-S3 Microcontroller &middot; MQTT 1883
          </p>
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#102A43] tracking-tight">
          Dispenser <span className="text-[#334E68]">Simulator</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#627D98] leading-relaxed">
          High-fidelity emulation of the physical MediServe IoT hardware device: SSD1306 128x64 OLED display,
          dual-color LED signaling (Green/Amber/Red), 2.4kHz piezoelectric alarm buzzer, 4-chamber motorized
          carousel, tactile confirm push button, and real-time MQTT gateway telemetry.
        </p>

        {/* System Architecture Highlights */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400">Microcontroller</span>
            <div className="font-bold text-slate-800 mt-0.5">ESP32-S3 Dual-Core</div>
            <div className="text-[10px] text-teal-600 font-mono">FreeRTOS v10.4</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400">Display &amp; Audio</span>
            <div className="font-bold text-slate-800 mt-0.5">SSD1306 + Piezo</div>
            <div className="text-[10px] text-teal-600 font-mono">128x64 I2C &bull; 2.4kHz</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400">Mechanism</span>
            <div className="font-bold text-slate-800 mt-0.5">4-Slot Carousel</div>
            <div className="text-[10px] text-teal-600 font-mono">28BYJ-48 Stepper</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400">Telemetry</span>
            <div className="font-bold text-slate-800 mt-0.5">MQTT QoS 1</div>
            <div className="text-[10px] text-teal-600 font-mono">mediserve/dispenser/*</div>
          </div>
        </div>
      </section>

      {/* Device Filter Tabs */}
      {devices.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
          <span className="text-xs font-semibold text-slate-500 mr-2">Filter Unit:</span>
          <button
            type="button"
            onClick={() => setSelectedDeviceId("ALL")}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors flex items-center ${
              selectedDeviceId === "ALL"
                ? "bg-[#0D9488] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All Units ({devices.length})
          </button>
          {devices.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDeviceId(d.id)}
              className={`min-h-[44px] px-3.5 py-2 text-xs font-mono rounded-lg transition-colors flex items-center ${
                selectedDeviceId === d.id
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {d.serial} {d.patient?.name ? `(${d.patient.name.split(" ")[0]})` : ""}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="border border-[#D9E2EC] bg-[#FFFFFF] p-8 text-center text-xs font-mono uppercase tracking-wider text-[#627D98] rounded-xl shadow-xs">
          Synchronizing hardware simulator state...
        </div>
      )}
      {error && (
        <div className="border border-[#DC2626]/30 bg-[#DC2626]/5 p-4 text-xs font-mono text-[#DC2626] rounded-xl shadow-xs">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {filteredDevices.map((d) => {
          const due = pending.find((e) => e.patientId === d.patientId);
          const messages = messagesByDevice[d.id] || [];
          return (
            <OledSimulatorPanel
              key={d.id}
              device={d}
              due={due}
              messages={messages}
              onSetState={(state) => setState(d.id, state)}
              onTick={() => tick(d.id)}
              onConfirm={() => confirm(d.id)}
              onTriggerDose={() => triggerDose(d.id)}
              onRefill={() => refill(d.id)}
              onSetBattery={(pct) => setBattery(d.id, pct)}
            />
          );
        })}
        {filteredDevices.length === 0 && !loading && (
          <p className="text-xs text-muted">No simulated devices active.</p>
        )}
      </div>
    </Shell>
  );
}
