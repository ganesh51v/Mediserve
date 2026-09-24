import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Utensils,
  PhoneCall,
  Wifi,
  WifiOff,
  User,
  Sparkles,
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { medicationService } from '../services/medicationService';
import { deviceService } from '../services/deviceService';
import { Patient, MedicationEvent, DoseStatus } from '../types';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { MedicationTimeline } from '../components/dashboard/MedicationTimeline';
import { SkeletonCard, SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const CaretakerDashboard: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [todayEvents, setTodayEvents] = useState<MedicationEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Hook into real-time websockets
  useSocket({
    onDoseUpdate: (payload) => {
      // Update today's events dynamically without refresh
      if (payload.event) {
        setTodayEvents((prev) =>
          prev.map((e) => (e.id === payload.event.id ? payload.event : e))
        );
      } else if (payload.events) {
        setTodayEvents((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          payload.events.forEach((ev: MedicationEvent) => map.set(ev.id, ev));
          return Array.from(map.values());
        });
      }
      showFlashMessage('Updated dose event in real time.');
    },
    onMealDetected: (payload) => {
      showFlashMessage(`Meal detected: ${payload.mealType.toUpperCase()}! Medications activated.`);
      refreshPatientData();
    },
    onDeviceUpdate: () => {
      refreshPatientData();
    },
  });

  const showFlashMessage = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const refreshPatientData = async () => {
    if (!selectedPatient) return;
    try {
      const detail = await patientService.getPatientById(selectedPatient.id);
      setTodayEvents(detail.todayEvents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const pts = await patientService.getPatients();
        setPatients(pts);
        if (pts.length > 0) {
          setSelectedPatient(pts[0]);
          const detail = await patientService.getPatientById(pts[0].id);
          setTodayEvents(detail.todayEvents);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    try {
      const detail = await patientService.getPatientById(patient.id);
      setTodayEvents(detail.todayEvents);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkTaken = async (eventId: string) => {
    try {
      const updated = await medicationService.recordDoseEvent(eventId, 'taken');
      setTodayEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updated : e))
      );
      showFlashMessage('Medication dose confirmed as taken.');
    } catch (e) {
      alert('Failed to record dose status');
    }
  };

  // Meal simulation trigger right inside caretaker view
  const handleTriggerMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!selectedPatient) return;
    try {
      await deviceService.sendDeviceEvent({
        event_type: 'MEAL_DETECTED',
        patient_id: selectedPatient.id,
        meal_type: mealType,
      });
      showFlashMessage(`Simulated ${mealType.toUpperCase()} meal event sent to MediServe dispenser!`);
    } catch (e) {
      alert('Failed to send meal event');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard count={6} />
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  // Calculate Today's Overview KPIs
  const totalScheduled = todayEvents.length;
  const takenCount = todayEvents.filter((e) => e.status === 'taken').length;
  const pendingCount = todayEvents.filter((e) => e.status === 'pending').length;
  const dispensingCount = todayEvents.filter((e) => e.status === 'dispensing' || e.status === 'dispensed').length;
  const missedCount = todayEvents.filter((e) => e.status === 'missed').length;
  const delayedCount = todayEvents.filter((e) => e.status === 'delayed').length;

  return (
    <div className="space-y-6">
      {/* Real-time alert pill */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Caretaker Header & Patient Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Caretaker Monitoring Station
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Today's Medication Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time meal-aware dosage tracking and emergency medical protocols
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label className="text-xs font-bold text-slate-600">Active Patient:</label>
          <select
            value={selectedPatient?.id || ''}
            onChange={(e) => {
              const p = patients.find((pt) => pt.id === e.target.value);
              if (p) handlePatientSelect(p);
            }}
            className="border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Today's 6 Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <DashboardCard
          title="Scheduled"
          value={totalScheduled}
          subtitle="Total doses today"
          icon={Pill}
          color="slate"
        />
        <DashboardCard
          title="Taken"
          value={takenCount}
          subtitle="Confirmed taken"
          icon={CheckCircle2}
          color="emerald"
        />
        <DashboardCard
          title="Pending"
          value={pendingCount}
          subtitle="Awaiting schedule"
          icon={Clock}
          color="amber"
        />
        <DashboardCard
          title="Dispensing"
          value={dispensingCount}
          subtitle="Active / Ready"
          icon={Sparkles}
          color="indigo"
        />
        <DashboardCard
          title="Missed"
          value={missedCount}
          subtitle="Alert triggered"
          icon={AlertCircle}
          color={missedCount > 0 ? 'rose' : 'slate'}
        />
        <DashboardCard
          title="Delayed"
          value={delayedCount}
          subtitle="Past ideal window"
          icon={AlertTriangle}
          color={delayedCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Main Grid: Timeline + Patient Telemetry & Emergency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Medication Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={`Medication Schedule & Meal Events for ${selectedPatient?.name || 'Patient'}`}
            subtitle="Updates automatically as hardware dispenses and meals are detected"
            action={
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">Simulate Meal:</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] py-1 px-2 text-teal-700 bg-teal-50 border-teal-200"
                  icon={<Utensils className="w-3 h-3" />}
                  onClick={() => handleTriggerMeal('breakfast')}
                >
                  Breakfast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] py-1 px-2 text-teal-700 bg-teal-50 border-teal-200"
                  icon={<Utensils className="w-3 h-3" />}
                  onClick={() => handleTriggerMeal('lunch')}
                >
                  Lunch
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] py-1 px-2 text-teal-700 bg-teal-50 border-teal-200"
                  icon={<Utensils className="w-3 h-3" />}
                  onClick={() => handleTriggerMeal('dinner')}
                >
                  Dinner
                </Button>
              </div>
            }
          >
            <MedicationTimeline
              events={todayEvents}
              onTakeDose={handleMarkTaken}
            />
          </Card>
        </div>

        {/* Right Sidebar: Emergency Contact, Hardware Status, Patient Snapshot */}
        <div className="space-y-6">
          {/* Emergency Card */}
          {selectedPatient && (
            <div className="bg-gradient-to-br from-rose-50 to-red-100 p-5 rounded-2xl border border-red-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <PhoneCall className="w-4 h-4" />
                <span>Emergency Contact Information</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{selectedPatient.emergency_contact}</p>
                <p className="text-rose-700 font-bold text-sm tracking-wide">
                  {selectedPatient.emergency_phone}
                </p>
                <p className="text-slate-500 text-[11px] pt-1">
                  Assigned Doctor: <span className="font-semibold text-slate-700">{selectedPatient.doctor_name || 'Dr. Robert Smith'}</span>
                </p>
              </div>
              <a
                href={`tel:${selectedPatient.emergency_phone}`}
                className="inline-flex w-full items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                One-Click Dial Emergency
              </a>
            </div>
          )}

          {/* Connected Device Telemetry */}
          <Card title="Dispenser Hardware Telemetry" subtitle="Real-time IoT device link">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Device Model</span>
                <span className="font-bold text-slate-900">
                  {selectedPatient?.assigned_device_id || 'MED-DEV-101'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Hardware Status</span>
                <Badge status={selectedPatient?.device_status || 'online'} size="sm" />
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Battery Level</span>
                <span className="font-bold text-slate-800">
                  {selectedPatient?.device_battery ?? 94}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Firmware</span>
                <span className="font-medium text-slate-700">v2.4.1</span>
              </div>

              <div className="pt-2">
                <Link to="/simulator">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    Open Hardware Simulator →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Patient Quick Profile Link */}
          {selectedPatient && (
            <Card title="Patient Profile" subtitle="Medical summary">
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Conditions</span>
                  <span className="text-slate-800 font-medium">{selectedPatient.medical_conditions}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Allergies</span>
                  <span className="text-rose-700 font-semibold">{selectedPatient.allergies || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                  <span className="text-slate-800 font-bold">{selectedPatient.blood_group}</span>
                </div>
                <div className="pt-2">
                  <Link to={`/patients/${selectedPatient.id}`}>
                    <Button size="sm" className="w-full text-xs">
                      View Full 7-Tab Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
