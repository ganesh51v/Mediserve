import api from './api';
import { AdherenceReport, Device, Medication } from '../types';

export interface ReportsSummaryResponse {
  adherence: AdherenceReport;
  missedDoses: any[];
  inventory: Medication[];
  devices: Device[];
}

export const reportService = {
  async getReportsSummary(params?: { startDate?: string; endDate?: string; patientId?: string }): Promise<ReportsSummaryResponse> {
    const res = await api.get('/reports/summary', { params });
    return res.data;
  },

  async downloadCsv(type: 'adherence' | 'medication_history' | 'inventory' | 'alerts', patientId?: string): Promise<void> {
    const params = new URLSearchParams({ type });
    if (patientId) params.append('patientId', patientId);

    const token = localStorage.getItem('mediserve_token');
    const response = await fetch(`/api/reports/export/csv?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediserve_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getAuditLogs(params?: { action?: string; entityType?: string }): Promise<any[]> {
    const res = await api.get('/audit', { params });
    return res.data.logs;
  },
};
