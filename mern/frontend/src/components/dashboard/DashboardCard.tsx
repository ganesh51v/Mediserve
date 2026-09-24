import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'teal' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  trend,
  onClick,
}) => {
  const colorStyles = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'group-hover:border-teal-300' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'group-hover:border-emerald-300' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'group-hover:border-amber-300' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'group-hover:border-rose-300' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'group-hover:border-indigo-300' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'group-hover:border-slate-300' },
  };

  const scheme = colorStyles[color];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md ${scheme.ring} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 tracking-wider uppercase">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <span className={`inline-flex items-center text-xs font-semibold mt-1 ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div className={`p-3 rounded-xl ${scheme.bg} ${scheme.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
