import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Battery, Wifi, WifiOff, AlertTriangle, RefreshCw, Radio, Sparkles } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { Device } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const DeviceManagementPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useSocket({
    onDeviceUpdate: () => loadDevices(),
  });

  const loadDevices = async () => {
    try {
      const res = await deviceService.getDevices();
      setDevices(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSimulateHeartbeat = async (deviceId: string) => {
    try {
      await deviceService.sendHeartbeat(deviceId, 96, 'strong');
      loadDevices();
    } catch (e) {
      alert('Failed to send heartbeat');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Hardware Infrastructure
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">MediServe Dispenser Fleet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status, telemetry, compartment pill counts, and battery health.
          </p>
        </div>
        <Link to="/simulator">
          <Button icon={<Radio className="w-4 h-4" />}>
            Interactive Hardware Simulator
          </Button>
        </Link>
      </div>

      {/* Fleet Cards */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((device) => {
            const compartments = JSON.parse(device.compartments_json || '[]');
            const totalPills = compartments.reduce((acc: number, c: any) => acc + (c.pills_remaining || 0), 0);

            return (
              <div
                key={device.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-teal-600" />
                      <h3 className="font-extrabold text-slate-900 text-base">{device.device_id}</h3>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Patient: <strong className="text-slate-800">{device.patient_name || 'Unassigned'}</strong>
                    </span>
                  </div>
                  <Badge status={device.status} size="sm" />
                </div>

                {/* Battery and Signal Gauge */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Battery</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Battery className={`w-4 h-4 ${device.battery_level < 20 ? 'text-rose-500' : 'text-emerald-600'}`} />
                      {device.battery_level}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Signal</span>
                    <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5 mt-0.5">
                      <Wifi className="w-4 h-4 text-teal-600" />
                      {device.signal_strength || 'Strong'}
                    </span>
                  </div>
                </div>

                {/* Dispensing status & Error */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dispensing Mechanism:</span>
                    <span className="font-semibold capitalize text-slate-800">{device.dispensing_status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Pills Remaining:</span>
                    <span className="font-bold text-teal-700">{totalPills} total units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Firmware:</span>
                    <span className="text-slate-600">{device.firmware_version}</span>
                  </div>
                  {device.error_message && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px] font-medium mt-2">
                      ⚠️ {device.error_message}
                    </div>
                  )}
                </div>

                {/* Compartments visual bar */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Compartment Fill Levels (Slots 1–6)
                  </span>
                  <div className="grid grid-cols-6 gap-1">
                    {compartments.map((comp: any) => (
                      <div
                        key={comp.compartment}
                        className={`h-8 rounded flex flex-col items-center justify-center text-[10px] font-bold border ${
                          comp.pills_remaining === 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : comp.pills_remaining <= 5
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}
                        title={`Slot ${comp.compartment}: ${comp.pills_remaining} pills`}
                      >
                        {comp.pills_remaining}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Sync: {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-1"
                    onClick={() => handleSimulateHeartbeat(device.device_id)}
                  >
                    Ping Heartbeat
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
