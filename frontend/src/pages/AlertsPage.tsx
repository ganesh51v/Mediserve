import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { alertService } from '../services/alertService';
import { Alert } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AlertCard } from '../components/dashboard/AlertCard';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useSocket({
    onAlertNew: () => loadAlerts(),
    onAlertUpdated: () => loadAlerts(),
  });

  const loadAlerts = async () => {
    try {
      const res = await alertService.getAlerts({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setAlerts(res.alerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, statusFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await alertService.acknowledgeAlert(id);
      loadAlerts();
    } catch (e) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await alertService.resolveAlert(id);
      loadAlerts();
    } catch (e) {
      alert('Failed to resolve alert');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllRead();
      loadAlerts();
    } catch (e) {
      alert('Failed to mark all as read');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Clinical Notification Center
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Alerts & Incidents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time medical warnings, missed doses, low medication refills, and hardware disconnects.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark All As Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-teal-600" /> Filters:
        </span>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alert Feed */}
      <Card title={`Active Alert Feed (${alerts.length})`}>
        {loading ? (
          <SkeletonLoader rows={6} />
        ) : alerts.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-xs">No alerts matching current filters.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((al) => (
              <AlertCard
                key={al.id}
                alert={al}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
