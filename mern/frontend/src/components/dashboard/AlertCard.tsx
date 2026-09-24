import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ShieldAlert, Clock } from 'lucide-react';
import { Alert } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  compact?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  compact = false,
}) => {
  const icons: Record<string, React.ReactNode> = {
    critical: <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    high: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    medium: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    low: <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />,
  };

  const bgStyles: Record<string, string> = {
    critical: 'bg-rose-50/50 border-rose-200',
    high: 'bg-rose-50/30 border-rose-200',
    medium: 'bg-amber-50/30 border-amber-200',
    low: 'bg-slate-50 border-slate-200',
  };

  const timeFormatted = new Date(alert.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        bgStyles[alert.severity] || 'bg-white border-slate-200'
      } ${alert.status === 'unread' ? 'ring-1 ring-teal-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icons[alert.severity] || icons.medium}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-slate-900 text-sm">{alert.title}</h4>
              <Badge status={alert.severity} size="sm" />
              <span className="text-xs text-slate-400">{timeFormatted}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
            {alert.patient_name && (
              <p className="text-xs font-medium text-teal-700">
                Patient: {alert.patient_name} {alert.patient_code ? `(${alert.patient_code})` : ''}
              </p>
            )}
            {alert.acknowledged_by_name && (
              <p className="text-xs text-slate-400 italic">
                Acknowledged by {alert.acknowledged_by_name}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!compact && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {alert.status === 'unread' && onAcknowledge && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs py-1 px-2.5"
                onClick={() => onAcknowledge(alert.id)}
              >
                Acknowledge
              </Button>
            )}
            {alert.status !== 'resolved' && onResolve && (
              <Button
                size="sm"
                variant="success"
                className="text-xs py-1 px-2.5"
                onClick={() => onResolve(alert.id)}
              >
                Resolve
              </Button>
            )}
            {alert.status === 'resolved' && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Resolved
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
