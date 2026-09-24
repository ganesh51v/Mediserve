import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Pill,
  Calendar,
  HeartPulse,
  Cpu,
  Bell,
  Activity,
  PhoneCall,
  ShieldAlert,
  Plus,
  CheckCircle2,
  Clock,
  Battery,
  Wifi,
} from 'lucide-react';
import { patientService, PatientDetailResponse } from '../services/patientService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AdherenceChart } from '../components/dashboard/AdherenceChart';
import { MedicationTimeline } from '../components/dashboard/MedicationTimeline';
import { AlertCard } from '../components/dashboard/AlertCard';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'medications' | 'schedule' | 'adherence' | 'health' | 'device' | 'alerts'
  >('overview');

  // Add Vitals Modal
  const [isVitalsOpen, setIsVitalsOpen] = useState<boolean>(false);
  const [vitals, setVitals] = useState({
    blood_pressure_sys: '' as unknown as number,
    blood_pressure_dia: '' as unknown as number,
    heart_rate: '' as unknown as number,
    blood_glucose: '' as unknown as number,
    temperature: '' as unknown as number,
    oxygen_saturation: '' as unknown as number,
    notes: '',
  });
  const [submittingVitals, setSubmittingVitals] = useState(false);

  // Hook into live websocket updates for this patient
  useSocket({
    onDoseUpdate: () => loadDetail(),
    onAlertNew: () => loadDetail(),
    onDeviceUpdate: () => loadDetail(),
  });

  const loadDetail = async () => {
    if (!id) return;
    try {
      const res = await patientService.getPatientById(id);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingVitals(true);
    try {
      await patientService.addHealthRecord(id, {
        blood_pressure_sys: vitals.blood_pressure_sys ? Number(vitals.blood_pressure_sys) : undefined,
        blood_pressure_dia: vitals.blood_pressure_dia ? Number(vitals.blood_pressure_dia) : undefined,
        heart_rate: vitals.heart_rate ? Number(vitals.heart_rate) : undefined,
        blood_glucose: vitals.blood_glucose ? Number(vitals.blood_glucose) : undefined,
        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
        oxygen_saturation: vitals.oxygen_saturation ? Number(vitals.oxygen_saturation) : undefined,
        notes: vitals.notes || undefined,
      });
      setIsVitalsOpen(false);
      setVitals({
        blood_pressure_sys: '' as unknown as number,
        blood_pressure_dia: '' as unknown as number,
        heart_rate: '' as unknown as number,
        blood_glucose: '' as unknown as number,
        temperature: '' as unknown as number,
        oxygen_saturation: '' as unknown as number,
        notes: '',
      });
      loadDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to log vitals');
    } finally {
      setSubmittingVitals(false);
    }
  };

  if (loading) {
    return <SkeletonLoader rows={10} />;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800">Patient not found</h3>
        <Link to="/patients" className="text-teal-600 text-xs font-semibold hover:underline mt-2 inline-block">
          ← Back to Patients Directory
        </Link>
      </div>
    );
  }

  const { patient, medications, schedules, todayEvents, device, healthRecords, alerts, adherence } = data;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'medications', label: `Medications (${medications.length})`, icon: Pill },
    { id: 'schedule', label: 'Daily Schedule', icon: Calendar },
    { id: 'adherence', label: `Adherence (${adherence.today.adherenceRate}%)`, icon: HeartPulse },
    { id: 'health', label: 'Health Records', icon: Activity },
    { id: 'device', label: 'Smart Dispenser', icon: Cpu },
    { id: 'alerts', label: `Alerts (${alerts.length})`, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Patients
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900">{patient.name}</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {patient.patient_code}
            </span>
            <Badge status={device?.status || 'offline'} size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            DOB: {patient.date_of_birth} ({patient.gender}) • Blood Group: {patient.blood_group || 'O+'} • Phone: {patient.phone || 'N/A'}
          </p>
        </div>

        {/* Quick Emergency Action */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Activity className="w-4 h-4" />}
            onClick={() => setIsVitalsOpen(true)}
          >
            Log Vitals
          </Button>
          <a
            href={`tel:${patient.emergency_phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition-colors shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span>Emergency: {patient.emergency_contact}</span>
          </a>
        </div>
      </div>

      {/* 7-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 overflow-x-auto shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Demographic & Medical Profile" className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical Conditions</span>
                <span className="font-semibold text-slate-800 text-sm">{patient.medical_conditions || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Known Allergies</span>
                <span className="font-semibold text-rose-700 text-sm">{patient.allergies || 'None recorded'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Residential Address</span>
                <span className="text-slate-700">{patient.address || 'Standard home residence'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Contact</span>
                <span className="text-slate-900 font-bold">{patient.emergency_contact} ({patient.emergency_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Attending Physician</span>
                <span className="text-teal-700 font-bold">{patient.doctor_name || 'Dr. Robert Smith'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Caretaker</span>
                <span className="text-slate-800 font-semibold">{patient.caretaker_name || 'Sarah Jenkins'}</span>
              </div>
            </div>
          </Card>

          {/* Quick Adherence Snapshot */}
          <Card title="Today's Adherence Snapshot">
            <div className="text-center py-3">
              <span className="text-4xl font-extrabold text-teal-600">
                {adherence.today.adherenceRate}%
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {adherence.today.taken} taken / {adherence.today.scheduled} scheduled doses today
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Missed Doses Today</span>
              <span className={`font-bold ${adherence.today.missed > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {adherence.today.missed}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: MEDICATIONS */}
      {activeTab === 'medications' && (
        <Card title="Prescribed Medications" subtitle="Active drug regimens, dosages, and refill quantities">
          <div className="divide-y divide-slate-100">
            {medications.map((med) => (
              <div key={med.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">
                      {med.dosage}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {med.medicine_type}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong>Schedule:</strong> {med.frequency} • {med.scheduled_time} ({med.meal_relation})
                  </p>
                  {med.instructions && (
                    <p className="text-slate-500 italic">Instructions: {med.instructions}</p>
                  )}
                  {med.special_precautions && (
                    <p className="text-amber-700">Precautions: {med.special_precautions}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 self-start sm:self-center">
                  <div className="text-right">
                    <span className={`font-extrabold text-sm block ${med.current_quantity <= med.refill_threshold ? 'text-rose-600' : 'text-slate-800'}`}>
                      {med.current_quantity} pills left
                    </span>
                    <span className="text-[10px] text-slate-400">Threshold: {med.refill_threshold}</span>
                  </div>
                  {med.current_quantity <= med.refill_threshold && (
                    <span className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px]">
                      Refill Required
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: SCHEDULE */}
      {activeTab === 'schedule' && (
        <Card title="Daily Medication Schedule & Timeline" subtitle="Meal-aware execution flow">
          <MedicationTimeline events={todayEvents} />
        </Card>
      )}

      {/* Tab 4: ADHERENCE */}
      {activeTab === 'adherence' && (
        <Card title="Medication Adherence Analytics" subtitle="Compliance tracking curves and trend history">
          <AdherenceChart data={adherence} />
        </Card>
      )}

      {/* Tab 5: HEALTH RECORDS */}
      {activeTab === 'health' && (
        <Card
          title="Clinical Health Records & Vitals"
          subtitle="Blood pressure, heart rate, glucose, and oxygenation telemetry"
          action={
            <Button size="sm" onClick={() => setIsVitalsOpen(true)}>
              + Log New Vitals
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Date & Time</th>
                  <th className="py-3 px-4">Blood Pressure</th>
                  <th className="py-3 px-4">Heart Rate</th>
                  <th className="py-3 px-4">Glucose</th>
                  <th className="py-3 px-4">SpO2</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {healthRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 text-slate-700 font-medium">
                      {new Date(rec.recorded_at).toLocaleDateString()}{' '}
                      {new Date(rec.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {rec.blood_pressure_sys && rec.blood_pressure_dia
                        ? `${rec.blood_pressure_sys}/${rec.blood_pressure_dia} mmHg`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-800">{rec.heart_rate ? `${rec.heart_rate} bpm` : '—'}</td>
                    <td className="py-3 px-4 text-slate-800">{rec.blood_glucose ? `${rec.blood_glucose} mg/dL` : '—'}</td>
                    <td className="py-3 px-4 text-slate-800">{rec.oxygen_saturation ? `${rec.oxygen_saturation}%` : '—'}</td>
                    <td className="py-3 px-4 text-slate-600 italic">{rec.notes || 'Routine check'}</td>
                    <td className="py-3 px-5 text-slate-500">{rec.recorded_by_name || 'Staff Nurse'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 6: DEVICE */}
      {activeTab === 'device' && (
        <div className="space-y-6">
          <Card title="Connected MediServe Smart Dispenser" subtitle="Hardware specs and compartment inventory">
            {device ? (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Device Identifier</span>
                    <span className="font-extrabold text-slate-900 text-sm">{device.device_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                    <Badge status={device.status} size="sm" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Battery Gauge</span>
                    <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                      <Battery className="w-4 h-4 text-emerald-600" /> {device.battery_level}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Firmware</span>
                    <span className="font-semibold text-slate-700">{device.firmware_version}</span>
                  </div>
                </div>

                {/* Compartment Mapping */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Dispenser Compartment Status (6 Slots)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {JSON.parse(device.compartments_json || '[]').map((comp: any) => (
                      <div key={comp.compartment} className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Slot #{comp.compartment}
                        </span>
                        <p className="font-bold text-slate-900 text-base">{comp.pills_remaining} pills</p>
                        <p className="text-[10px] text-slate-500">Cap: {comp.capacity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No hardware device assigned to this patient.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 7: ALERTS */}
      {activeTab === 'alerts' && (
        <Card title="Patient Alerts History" subtitle="Medication missed and hardware exceptions">
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No alerts for this patient.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => (
                <AlertCard key={al.id} alert={al} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Log Vitals Modal */}
      <Modal
        isOpen={isVitalsOpen}
        onClose={() => setIsVitalsOpen(false)}
        title="Record Patient Vitals"
        subtitle="Log clinical readings into patient medical history"
      >
        <form onSubmit={handleAddVitals} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Systolic BP (mmHg)</label>
              <input
                type="number"
                required
                placeholder="e.g. 120"
                value={vitals.blood_pressure_sys}
                onChange={(e) => setVitals({ ...vitals, blood_pressure_sys: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Diastolic BP (mmHg)</label>
              <input
                type="number"
                required
                placeholder="e.g. 80"
                value={vitals.blood_pressure_dia}
                onChange={(e) => setVitals({ ...vitals, blood_pressure_dia: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                required
                placeholder="e.g. 72"
                value={vitals.heart_rate}
                onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Glucose (mg/dL)</label>
              <input
                type="number"
                required
                placeholder="e.g. 100"
                value={vitals.blood_glucose}
                onChange={(e) => setVitals({ ...vitals, blood_glucose: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Oxygen Saturation SpO2 (%)</label>
              <input
                type="number"
                required
                placeholder="e.g. 98"
                value={vitals.oxygen_saturation}
                onChange={(e) => setVitals({ ...vitals, oxygen_saturation: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 98.6"
                value={vitals.temperature}
                onChange={(e) => setVitals({ ...vitals, temperature: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinical Observation Notes</label>
            <textarea
              rows={2}
              value={vitals.notes}
              onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
              placeholder="e.g. Patient rested comfortably before measurement."
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsVitalsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingVitals}>
              Save Vitals Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
