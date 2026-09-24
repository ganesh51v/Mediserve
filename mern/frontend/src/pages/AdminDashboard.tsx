import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  HeartHandshake,
  Cpu,
  AlertTriangle,
  Shield,
  Activity,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { authService } from '../services/authService';
import { patientService } from '../services/patientService';
import { deviceService } from '../services/deviceService';
import { alertService } from '../services/alertService';
import { reportService } from '../services/reportService';
import { User, Patient, Device, Alert, AuditLog } from '../types';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { SkeletonCard, SkeletonLoader } from '../components/common/SkeletonLoader';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add User modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    specialization: '',
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  const loadData = async () => {
    try {
      const [u, p, d, a, logs] = await Promise.all([
        authService.getUsers(),
        patientService.getPatients(),
        deviceService.getDevices(),
        alertService.getAlerts({ limit: 10 }),
        reportService.getAuditLogs({}),
      ]);
      setUsers(u);
      setPatients(p);
      setDevices(d);
      setAlerts(a.alerts);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      await authService.register(newUser);
      setIsAddUserOpen(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: '',
        specialization: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmittingUser(false);
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

  const doctorCount = users.filter((u) => u.role === 'doctor').length;
  const caretakerCount = users.filter((u) => u.role === 'caretaker').length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            System Administration
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">MediServe Platform Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full governance across clinical staff, smart hardware fleet, patients, and security audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {
              setLoading(true);
              loadData();
            }}
          >
            Refresh Data
          </Button>
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddUserOpen(true)}
          >
            Register Staff Member
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <DashboardCard title="Total Users" value={users.length} icon={Users} color="teal" />
        <DashboardCard title="Doctors" value={doctorCount} icon={UserCheck} color="indigo" />
        <DashboardCard title="Caretakers" value={caretakerCount} icon={HeartHandshake} color="amber" />
        <DashboardCard title="Patients" value={patients.length} icon={Activity} color="teal" />
        <DashboardCard title="Active Devices" value={onlineDevices} icon={Cpu} color="emerald" />
        <DashboardCard title="Offline Devices" value={offlineDevices} icon={Cpu} color={offlineDevices > 0 ? 'rose' : 'slate'} />
        <DashboardCard title="Critical Alerts" value={criticalAlerts} icon={AlertTriangle} color={criticalAlerts > 0 ? 'rose' : 'slate'} />
      </div>

      {/* User Management Table */}
      <Card
        title="Clinical & System Users Directory"
        subtitle="Manage authorized doctors, caretakers, and system administrators"
        action={
          <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
            + Add Staff
          </Button>
        }
      >
        <div className="overflow-x-auto -mx-5 -my-5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Staff Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Specialization</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-5 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.specialization || 'General Care'}</td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <Badge status={u.status} size="sm" />
                  </td>
                  <td className="py-3 px-5 text-right text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Two columns: Device Health & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Health */}
        <Card
          title="Smart Dispenser Fleet Telemetry"
          subtitle="Hardware operational status"
          action={
            <Link to="/devices" className="text-xs font-semibold text-teal-600 hover:underline">
              Manage Hardware →
            </Link>
          }
        >
          <div className="divide-y divide-slate-100 text-xs">
            {devices.slice(0, 5).map((dev) => (
              <div key={dev.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{dev.device_id}</span>
                  <span className="text-[11px] text-slate-500">
                    Assigned: {dev.patient_name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-medium">Battery {dev.battery_level}%</span>
                  <Badge status={dev.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit Trail */}
        <Card
          title="System Audit & Compliance Log"
          subtitle="Recent system actions and clinical traces"
          action={
            <Link to="/audit-logs" className="text-xs font-semibold text-teal-600 hover:underline">
              Full Audit Trail →
            </Link>
          }
        >
          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{log.details}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>User: {log.user_name || 'System'}</span>
                  <span>• IP: {log.ip_address || '127.0.0.1'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Register Healthcare Staff"
        subtitle="Add a new Doctor, Caretaker, or Administrator"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="e.g. Dr. Jane Williams"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="jane.williams@mediserve.health"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                required
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Role...</option>
                <option value="doctor">Doctor</option>
                <option value="caretaker">Caretaker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+1 555-0199"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Specialization / Department</label>
            <input
              type="text"
              value={newUser.specialization}
              onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
              placeholder="e.g. Neurology, Senior Home Care"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingUser}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
