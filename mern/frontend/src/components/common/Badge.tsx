import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { DoseStatus, DeviceStatus } from '../../types';

interface BadgeProps {
  status: DoseStatus | DeviceStatus | 'active' | 'inactive' | 'suspended' | 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs font-semibold px-2.5 py-1 gap-1.5';

  const config: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    // Dose statuses
    taken: {
      label: 'Taken',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
    },
    pending: {
      label: 'Pending',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
    },
    dispensing: {
      label: 'Dispensing',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" aria-hidden="true" />,
    },
    dispensed: {
      label: 'Dispensed',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />,
    },
    missed: {
      label: 'Missed',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />,
    },
    delayed: {
      label: 'Delayed',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />,
    },
    skipped: {
      label: 'Skipped',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />,
    },

    // Device statuses
    online: {
      label: 'Online',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
    },
    warning: {
      label: 'Warning',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
    },
    offline: {
      label: 'Device Offline',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <WifiOff className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />,
    },

    // Severity
    critical: {
      label: 'Critical',
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-700" aria-hidden="true" />,
    },
    high: {
      label: 'High',
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />,
    },
    low: {
      label: 'Low',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />,
    },
    active: {
      label: 'Active',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />,
    },
    inactive: {
      label: 'Inactive',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" />,
    },
  };

  const item = config[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Status: ${item.label}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
