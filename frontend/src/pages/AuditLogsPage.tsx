import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw } from 'lucide-react';
import { reportService } from '../services/reportService';
import { AuditLog } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    try {
      const res = await reportService.getAuditLogs();
      setLogs(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.user_name && l.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Security & Governance
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">System Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all staff logins, patient registrations, prescription orders, and alert resolutions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={() => {
            setLoading(true);
            loadLogs();
          }}
        >
          Refresh Audit Trail
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit entries by action, user name, or detail keyword..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        />
      </div>

      {/* Logs Table */}
      <Card title={`Audit Events (${filteredLogs.length})`}>
        {loading ? (
          <SkeletonLoader rows={8} />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Staff / User</th>
                  <th className="py-3 px-5 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 text-slate-700 font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()}{' '}
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 uppercase font-semibold text-[10px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-sm truncate">{log.details}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {log.user_name || 'System / Automated'}
                    </td>
                    <td className="py-3 px-5 text-right text-slate-400 font-mono text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
