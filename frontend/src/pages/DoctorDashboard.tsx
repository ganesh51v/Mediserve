import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Stethoscope,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { medicationService } from '../services/medicationService';
import { alertService } from '../services/alertService';
import { Patient, Alert, Medication, MedicationType, MealRelation } from '../types';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { AlertCard } from '../components/dashboard/AlertCard';
import { SkeletonCard, SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const DoctorDashboard: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Prescription modal state
  const [isPrescribeOpen, setIsPrescribeOpen] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [newMed, setNewMed] = useState({
    name: '',
    medicine_type: '' as unknown as MedicationType,
    dosage: '',
    frequency: '',
    meal_relation: '' as unknown as MealRelation,
    scheduled_time: '',
    start_date: '',
    end_date: '',
    current_quantity: '' as unknown as number,
    refill_threshold: '' as unknown as number,
    instructions: '',
    special_precautions: '',
  });
  const [submittingRx, setSubmittingRx] = useState<boolean>(false);
  const [rxSuccess, setRxSuccess] = useState<string | null>(null);

  // Hook into live websocket updates
  useSocket({
    onDoseUpdate: () => loadData(),
    onAlertNew: (newAlert) => setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]),
  });

  const loadData = async () => {
    try {
      const [pts, altRes] = await Promise.all([
        patientService.getPatients(),
        alertService.getAlerts({ limit: 5 }),
      ]);
      setPatients(pts);
      setAlerts(altRes.alerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient');
      return;
    }
    setSubmittingRx(true);
    setRxSuccess(null);
    try {
      await medicationService.createMedication({
        ...newMed,
        patient_id: selectedPatientId,
        current_quantity: Number(newMed.current_quantity),
        refill_threshold: Number(newMed.refill_threshold),
      });
      setRxSuccess('Prescription created and daily schedule initiated successfully!');
      setTimeout(() => {
        setIsPrescribeOpen(false);
        setRxSuccess(null);
        setSelectedPatientId('');
        setNewMed({
          name: '',
          medicine_type: '' as unknown as MedicationType,
          dosage: '',
          frequency: '',
          meal_relation: '' as unknown as MealRelation,
          scheduled_time: '',
          start_date: '',
          end_date: '',
          current_quantity: '' as unknown as number,
          refill_threshold: '' as unknown as number,
          instructions: '',
          special_precautions: '',
        });
      }, 1200);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit prescription');
    } finally {
      setSubmittingRx(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard count={4} />
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  const criticalAlertsCount = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-600 to-teal-800 text-white p-6 rounded-2xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-teal-200">
            Physician Care Center
          </span>
          <h2 className="text-2xl font-bold mt-1">Doctor Clinical Workspace</h2>
          <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-xl">
            Monitor assigned patients, configure meal-aware medication schedules, and track real-time dispenser adherence.
          </p>
        </div>
        <Button
          variant="secondary"
          className="bg-white text-teal-800 hover:bg-teal-50 self-start sm:self-auto font-bold shadow-sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsPrescribeOpen(true)}
        >
          New Prescription
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Assigned Patients"
          value={patients.length}
          subtitle="Actively monitored"
          icon={Users}
          color="teal"
        />
        <DashboardCard
          title="Connected Dispensers"
          value={patients.filter((p) => p.device_status === 'online').length}
          subtitle="Smart IoT hardware active"
          icon={Activity}
          color="emerald"
        />
        <DashboardCard
          title="Adherence Rate"
          value="92%"
          subtitle="Overall patient cohort"
          icon={HeartPulse}
          color="indigo"
          trend={{ value: '3% this week', positive: true }}
        />
        <DashboardCard
          title="Active Alerts"
          value={criticalAlertsCount}
          subtitle="Requiring clinical review"
          icon={AlertTriangle}
          color={criticalAlertsCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Main Grid: Patients and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Patients Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="My Assigned Patients"
            subtitle="Select a patient to review their 7-tab profile and meal schedules"
            action={
              <Link to="/patients">
                <Button size="sm" variant="ghost" className="text-xs font-semibold text-teal-600">
                  View All Patients →
                </Button>
              </Link>
            }
          >
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-5">Patient</th>
                    <th className="py-3 px-4">Conditions</th>
                    <th className="py-3 px-4">Hardware Dispenser</th>
                    <th className="py-3 px-4">Caretaker</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.slice(0, 6).map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5">
                        <Link to={`/patients/${patient.id}`} className="group block">
                          <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {patient.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{patient.patient_code}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {patient.medical_conditions || 'None recorded'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={patient.device_status || 'offline'} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {patient.caretaker_name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Link to={`/patients/${patient.id}`}>
                          <Button size="sm" variant="outline" className="text-xs py-1 px-2.5">
                            View Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Alerts Feed */}
        <div className="space-y-6">
          <Card
            title="Recent Patient Alerts"
            subtitle="Dose events & device telemetry"
            action={
              <Link to="/alerts" className="text-xs text-teal-600 font-semibold hover:underline">
                View All
              </Link>
            }
          >
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent alerts</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} compact={true} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Prescription Creation Modal */}
      <Modal
        isOpen={isPrescribeOpen}
        onClose={() => setIsPrescribeOpen(false)}
        title="Doctor Medication Prescription"
        subtitle="Configure dosage, frequency, and meal-aware scheduling parameters"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
          {rxSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg font-medium border border-emerald-200">
              {rxSuccess}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Select Patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patient_code}) - {p.medical_conditions}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medicine Name</label>
              <input
                type="text"
                required
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                placeholder="e.g. Lisinopril, Metformin"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Form / Type</label>
              <select
                required
                value={newMed.medicine_type}
                onChange={(e) => setNewMed({ ...newMed, medicine_type: e.target.value as MedicationType })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Medicine Type...</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Liquid">Liquid</option>
                <option value="Injection">Injection</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Topical">Topical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dosage</label>
              <input
                type="text"
                required
                value={newMed.dosage}
                onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                placeholder="e.g. 10mg, 500mg"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Quantity</label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 30"
                value={newMed.current_quantity}
                onChange={(e) => setNewMed({ ...newMed, current_quantity: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Refill Threshold</label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 5"
                value={newMed.refill_threshold}
                onChange={(e) => setNewMed({ ...newMed, refill_threshold: e.target.value as unknown as number })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
              <select
                required
                value={newMed.frequency}
                onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Frequency...</option>
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Every 8 hours">Every 8 hours</option>
                <option value="As needed (PRN)">As needed (PRN)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-teal-800 mb-1 flex items-center gap-1">
                🍽️ Meal Relationship (Meal-Aware System)
              </label>
              <select
                required
                value={newMed.meal_relation}
                onChange={(e) => setNewMed({ ...newMed, meal_relation: e.target.value as any })}
                className="w-full border border-teal-400 bg-teal-50/50 rounded-lg p-2 text-xs focus:ring-teal-500 font-medium text-teal-900"
              >
                <option value="">Select Meal Relation...</option>
                <option value="Before Breakfast">Before Breakfast</option>
                <option value="After Breakfast">After Breakfast</option>
                <option value="Before Lunch">Before Lunch</option>
                <option value="After Lunch">After Lunch</option>
                <option value="Before Dinner">Before Dinner</option>
                <option value="After Dinner">After Dinner</option>
                <option value="With Meal">With Meal</option>
                <option value="Empty Stomach">Empty Stomach</option>
                <option value="Custom Time">Custom Time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Time</label>
              <input
                type="time"
                required
                value={newMed.scheduled_time}
                onChange={(e) => setNewMed({ ...newMed, scheduled_time: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={newMed.start_date}
                onChange={(e) => setNewMed({ ...newMed, start_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Patient Instructions</label>
            <textarea
              rows={2}
              value={newMed.instructions}
              onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
              placeholder="e.g. Swallow whole with a full glass of water."
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Special Precautions / Contraindications</label>
            <input
              type="text"
              value={newMed.special_precautions}
              onChange={(e) => setNewMed({ ...newMed, special_precautions: e.target.value })}
              placeholder="e.g. Avoid grapefruit juice; monitor blood pressure."
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsPrescribeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingRx}>
              Authorize & Save Prescription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
