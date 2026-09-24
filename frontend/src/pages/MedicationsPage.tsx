import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { medicationService } from '../services/medicationService';
import { Medication } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const MedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Refill Modal state
  const [isRefillOpen, setIsRefillOpen] = useState(false);
  const [refillTargetMed, setRefillTargetMed] = useState<Medication | null>(null);
  const [refillQty, setRefillQty] = useState<number | string>('');
  const [submittingRefill, setSubmittingRefill] = useState(false);

  useSocket({
    onDoseUpdate: () => loadMedications(),
    onRefillNeeded: () => loadMedications(),
  });

  const loadMedications = async () => {
    try {
      const res = await medicationService.getMedications({ q: searchTerm });
      setMedications(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [searchTerm]);

  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillTargetMed || !refillQty) return;
    setSubmittingRefill(true);
    try {
      await medicationService.refillMedication(refillTargetMed.id, Number(refillQty));
      setIsRefillOpen(false);
      setRefillTargetMed(null);
      setRefillQty('');
      loadMedications();
    } catch (e) {
      alert('Failed to update medication stock');
    } finally {
      setSubmittingRefill(false);
    }
  };

  const lowStockMeds = medications.filter((m) => m.current_quantity <= m.refill_threshold);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Pharmacy & Prescriptions
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Medication Inventory & Prescriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active medication schedules, meal timing rules, stock monitoring, and automatic refill thresholds.
          </p>
        </div>
      </div>

      {/* Low Stock Warning Banner if applicable */}
      {lowStockMeds.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-rose-900">
              {lowStockMeds.length} Medication(s) Require Immediate Refill
            </h4>
            <p className="text-rose-700">
              The following prescriptions have dropped to or below their safety refill thresholds:
              {' '}{lowStockMeds.map((m) => `${m.name} for ${m.patient_name} (${m.current_quantity} left)`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter medications by name, patient, or instructions..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        />
      </div>

      {/* Medications Table */}
      <Card title="Prescriptions Inventory Directory">
        {loading ? (
          <SkeletonLoader rows={6} />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Medicine & Dosage</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Meal Rule</th>
                  <th className="py-3 px-4">Frequency & Time</th>
                  <th className="py-3 px-4">Remaining Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((med) => {
                  const isLow = med.current_quantity <= med.refill_threshold;
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-900 block text-sm">{med.name}</span>
                        <span className="text-[11px] text-teal-700 font-semibold">
                          {med.dosage} • {med.medicine_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{med.patient_name}</span>
                        <span className="text-[10px] text-slate-400">{med.patient_code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-teal-50 text-teal-800 border border-teal-200">
                          {med.meal_relation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {med.frequency} at {med.scheduled_time}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold text-sm ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {med.current_quantity} pills
                          </span>
                          <span className="text-[10px] text-slate-400">/ Thresh: {med.refill_threshold}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1 px-2.5"
                          icon={<RefreshCw className="w-3 h-3" />}
                          onClick={() => {
                            setRefillTargetMed(med);
                            setRefillQty('');
                            setIsRefillOpen(true);
                          }}
                        >
                          Refill Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Refill Inventory Modal */}
      <Modal
        isOpen={isRefillOpen}
        onClose={() => setIsRefillOpen(false)}
        title="Refill Medication Inventory"
        subtitle={`Add stock for ${refillTargetMed?.name} (${refillTargetMed?.dosage})`}
      >
        <form onSubmit={handleRefillSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p><strong>Patient:</strong> {refillTargetMed?.patient_name}</p>
            <p><strong>Current In Stock:</strong> {refillTargetMed?.current_quantity} pills</p>
            <p><strong>Refill Alert Threshold:</strong> {refillTargetMed?.refill_threshold} pills</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Quantity to Add (Pills / Units)
            </label>
            <input
              type="number"
              min="1"
              required
              value={refillQty}
              onChange={(e) => setRefillQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 30"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsRefillOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingRefill}>
              Confirm Stock Refill
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
