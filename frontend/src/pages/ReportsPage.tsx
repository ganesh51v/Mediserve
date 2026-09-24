import React, { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { reportService, ReportsSummaryResponse } from '../services/reportService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AdherenceChart } from '../components/dashboard/AdherenceChart';
import { SkeletonLoader } from '../components/common/SkeletonLoader';

export const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ReportsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'adherence' | 'medication_history' | 'inventory' | 'alerts'>('adherence');

  const loadReport = async () => {
    try {
      const res = await reportService.getReportsSummary();
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleDownloadCsv = () => {
    reportService.downloadCsv(reportType);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !reportData) {
    return <SkeletonLoader rows={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Clinical Analytics & Compliance
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Healthcare Reporting Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adherence metrics, missed doses logs, dispenser fleet audits, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Report
          </Button>
          <Button
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadCsv}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 overflow-x-auto shadow-sm">
        {[
          { id: 'adherence', label: 'Adherence Analytics' },
          { id: 'medication_history', label: 'Medication Doses History' },
          { id: 'inventory', label: 'Medication Inventory & Refills' },
          { id: 'alerts', label: 'Alert History Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              reportType === tab.id
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Adherence View */}
      {reportType === 'adherence' && (
        <Card title="Cohort Medication Adherence Overview">
          <AdherenceChart data={reportData.adherence} />
        </Card>
      )}

      {/* Missed Doses / Medication History View */}
      {reportType === 'medication_history' && (
        <Card title="Recent Missed & Delayed Medication Events" subtitle="Review unconfirmed doses for intervention">
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Scheduled Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Medication</th>
                  <th className="py-3 px-4">Dosage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5">Meal Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.missedDoses.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 text-slate-700 font-medium">
                      {new Date(m.scheduled_time).toLocaleDateString()} {new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.patient_name}</td>
                    <td className="py-3 px-4 text-slate-800">{m.medication_name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.dosage}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-500 italic">{m.meal_context || 'Standard schedule'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Inventory View */}
      {reportType === 'inventory' && (
        <Card title="Medication Inventory Stock Report" subtitle="All registered medications and refill indicators">
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Medication</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Refill Threshold</th>
                  <th className="py-3 px-4">Meal Relation</th>
                  <th className="py-3 px-5 text-right">Stock Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.inventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 font-bold text-slate-900">{inv.name} ({inv.dosage})</td>
                    <td className="py-3 px-4 text-slate-700">{inv.patient_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{inv.current_quantity} pills</td>
                    <td className="py-3 px-4 text-slate-500">{inv.refill_threshold} pills</td>
                    <td className="py-3 px-4 text-slate-700">{inv.meal_relation}</td>
                    <td className="py-3 px-5 text-right">
                      {inv.current_quantity <= inv.refill_threshold ? (
                        <span className="text-rose-600 font-bold">REFILL REQUIRED</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">SUFFICIENT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Alerts View */}
      {reportType === 'alerts' && (
        <Card title="Alert History Summary" subtitle="Click Export to CSV above for full audit records">
          <p className="text-xs text-slate-600 py-4">
            Alert logs are tracked across all clinical entities. Use the <strong>Export to CSV</strong> button in the top right to download the complete spreadsheet of alerts, timestamps, and staff acknowledgments.
          </p>
        </Card>
      )}
    </div>
  );
};
