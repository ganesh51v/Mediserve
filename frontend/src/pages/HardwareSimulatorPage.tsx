import React, { useState, useEffect } from 'react';
import {
  Radio,
  Utensils,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { Device } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const HardwareSimulatorPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [batteryValue, setBatteryValue] = useState<number>(0);
  const [simLogs, setSimLogs] = useState<Array<{ time: string; type: string; details: string; status: 'ok' | 'warn' | 'err' }>>([]);


  useEffect(() => {
    async function load() {
      try {
        const devs = await deviceService.getDevices();
        setDevices(devs);
        if (devs.length > 0) {
          setSelectedDeviceId(devs[0].device_id);
          setBatteryValue(devs[0].battery_level ?? 0);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const addLog = (type: string, details: string, status: 'ok' | 'warn' | 'err' = 'ok') => {
    const time = new Date().toLocaleTimeString();
    setSimLogs((prev) => [{ time, type, details, status }, ...prev.slice(0, 19)]);
  };

  const currentDevice = devices.find((d) => d.device_id === selectedDeviceId);

  const handleSimulateEvent = async (eventType: string, extraPayload?: any) => {
    if (!selectedDeviceId || !currentDevice) return;

    try {
      const res = await deviceService.sendDeviceEvent({
        event_type: eventType,
        device_id: selectedDeviceId,
        patient_id: currentDevice.patient_id,
        meal_type: selectedMeal,
        payload: extraPayload,
      });

      addLog(eventType, `Dispatched to MediServe API: ${JSON.stringify(res.message || res)}`, 'ok');
    } catch (err: any) {
      addLog(eventType, `Error: ${err.response?.data?.error || err.message}`, 'err');
    }
  };

  const handleSendHeartbeat = async () => {
    if (!selectedDeviceId) return;
    try {
      await deviceService.sendHeartbeat(selectedDeviceId, batteryValue, 'strong');
      addLog('HEARTBEAT', `Updated battery to ${batteryValue}% for ${selectedDeviceId}`, 'ok');
    } catch (err: any) {
      addLog('HEARTBEAT', `Heartbeat failed: ${err.message}`, 'err');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Interactive IoT Hardware Emulation</span>
          </div>
          <h2 className="text-2xl font-black mt-1">Smart Dispenser Device Simulator</h2>
          <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-xl">
            Trigger real-time meal detection, dispensing sequences, patient dose confirmations, and hardware fault states to inspect the immediate dashboard response.
          </p>
        </div>
      </div>

      {/* Target Device Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Target IoT Hardware:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              const found = devices.find((d) => d.device_id === e.target.value);
              if (found) setBatteryValue(found.battery_level ?? 0);
            }}
            className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-teal-500"
          >
            <option value="">Select Hardware Device...</option>
            {devices.map((d) => (
              <option key={d.id} value={d.device_id}>
                {d.device_id} — Assigned: {d.patient_name || 'Unassigned'} ({d.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {currentDevice && (
          <div className="flex items-center gap-3 text-xs">
            <Badge status={currentDevice.status} size="sm" />
            <span className="text-slate-500">
              Battery: <strong className="text-slate-800">{currentDevice.battery_level}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Event Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Interactive Event Buttons */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Meal-Aware Events */}
          <Card
            title="1. Meal Detection Simulator (Meal-Aware System)"
            subtitle="Simulates breakfast, lunch, or dinner sensor event to activate scheduled medications"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Select Meal Type:</label>
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMeal(meal)}
                      className={`capitalize px-3 py-1 rounded-md font-semibold transition-all ${
                        selectedMeal === meal
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {meal}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full sm:w-auto"
                icon={<Utensils className="w-4 h-4" />}
                onClick={() => handleSimulateEvent('MEAL_DETECTED')}
              >
                Trigger MEAL_DETECTED ({selectedMeal.toUpperCase()})
              </Button>
            </div>
          </Card>

          {/* 2. Dispenser & Patient Dosage Actions */}
          <Card
            title="2. Medication Dispensing & Adherence Events"
            subtitle="Test real-time dashboard transitions: Pending → Dispensing → Taken / Missed"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start text-xs font-bold py-3 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-800"
                icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
                onClick={() => handleSimulateEvent('MEDICATION_DISPENSED')}
              >
                MEDICATION_DISPENSED (Hardware confirms release)
              </Button>

              <Button
                variant="success"
                className="justify-start text-xs font-bold py-3"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleSimulateEvent('DOSE_TAKEN')}
              >
                DOSE_TAKEN (Patient took dose)
              </Button>

              <Button
                variant="danger"
                className="justify-start text-xs font-bold py-3"
                icon={<AlertCircle className="w-4 h-4" />}
                onClick={() => handleSimulateEvent('DOSE_MISSED')}
              >
                DOSE_MISSED (Timeout alert triggered)
              </Button>

              <Button
                variant="outline"
                className="justify-start text-xs font-bold py-3 text-amber-800 bg-amber-50/50 hover:bg-amber-50 border-amber-200"
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                onClick={() => handleSimulateEvent('LOW_MEDICINE')}
              >
                LOW_MEDICINE (Refill alert triggered)
              </Button>
            </div>
          </Card>

          {/* 3. Hardware Connectivity & Telemetry */}
          <Card
            title="3. Hardware Connectivity & Diagnostics"
            subtitle="Simulate disconnects, jams, and battery drain"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="text-xs font-semibold py-2.5"
                  icon={<Wifi className="w-4 h-4 text-emerald-600" />}
                  onClick={() => handleSimulateEvent('DEVICE_ONLINE')}
                >
                  DEVICE_ONLINE
                </Button>
                <Button
                  variant="outline"
                  className="text-xs font-semibold py-2.5 text-rose-700 bg-rose-50/50 border-rose-200"
                  icon={<WifiOff className="w-4 h-4 text-rose-600" />}
                  onClick={() => handleSimulateEvent('DEVICE_OFFLINE')}
                >
                  DEVICE_OFFLINE
                </Button>
                <Button
                  variant="outline"
                  className="text-xs font-semibold py-2.5 text-rose-700 bg-rose-50/50 border-rose-200"
                  icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
                  onClick={() =>
                    handleSimulateEvent('DISPENSER_ERROR', { error: 'Rotary motor jammed in slot 2' })
                  }
                >
                  DISPENSER_ERROR
                </Button>
              </div>

              {/* Battery level slider */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-slate-700 whitespace-nowrap">
                    Simulate Battery: {batteryValue}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={batteryValue}
                    onChange={(e) => setBatteryValue(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={handleSendHeartbeat}>
                  Send Heartbeat
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Column 3: Live Simulator Console Logs */}
        <div>
          <Card
            title="Telemetry Console Log"
            subtitle="Real-time event stream"
            action={
              <button
                onClick={() => setSimLogs([])}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Clear
              </button>
            }
          >
            {simLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Ready. Click any action on the left to fire simulated IoT events.
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono max-h-[500px] overflow-y-auto">
                {simLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                      log.status === 'err'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : log.status === 'warn'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-teal-700">{log.type}</span>
                      <span className="text-[10px] text-slate-400">{log.time}</span>
                    </div>
                    <p className="break-all">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
