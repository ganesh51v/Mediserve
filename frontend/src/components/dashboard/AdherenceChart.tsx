import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { AdherenceReport } from '../../types';
import { Info } from 'lucide-react';

interface AdherenceChartProps {
  data: AdherenceReport;
  className?: string;
}

export const AdherenceChart: React.FC<AdherenceChartProps> = ({ data, className = '' }) => {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const weeklyData = data.weekly?.dailyTrend || [];
  const monthlyData = data.monthly?.weeklyTrend || [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-teal-700">
            {view === 'weekly' ? `${data.weekly.adherenceRate}%` : `${data.monthly.adherenceRate}%`}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {view === 'weekly'
              ? `${data.weekly.taken} of ${data.weekly.scheduled} doses taken (Last 7 Days)`
              : `${data.monthly.taken} of ${data.monthly.scheduled} doses taken (Past Month)`}
          </span>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => setView('weekly')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              view === 'weekly' ? 'bg-white text-teal-700 font-semibold shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Weekly (7 Days)
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              view === 'monthly' ? 'bg-white text-teal-700 font-semibold shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Monthly Overview
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'weekly' ? (
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value}% Adherence`, 'Rate']}
                labelFormatter={(label: any) => `Day: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="adherenceRate"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adherenceGrad)"
              />
            </AreaChart>
          ) : (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value}% Adherence`, 'Rate']}
              />
              <Bar dataKey="rate" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Required Healthcare Compliance Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-500">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700">Safety Notice:</strong> {data.disclaimer}
        </p>
      </div>
    </div>
  );
};
