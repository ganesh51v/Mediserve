import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleGuard } from '../components/layout/RoleGuard';
import { AppLayout } from '../components/layout/AppLayout';

// Pages
import { Login } from '../pages/Login';
import { AdminDashboard } from '../pages/AdminDashboard';
import { DoctorDashboard } from '../pages/DoctorDashboard';
import { CaretakerDashboard } from '../pages/CaretakerDashboard';
import { PatientsPage } from '../pages/PatientsPage';
import { PatientDetailPage } from '../pages/PatientDetailPage';
import { MedicationsPage } from '../pages/MedicationsPage';
import { DeviceManagementPage } from '../pages/DeviceManagementPage';
import { HardwareSimulatorPage } from '../pages/HardwareSimulatorPage';
import { AlertsPage } from '../pages/AlertsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';

// Helper component to redirect root "/" to role home
const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  return <Navigate to="/caretaker" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes inside AppLayout */}
      <Route element={<RoleGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Role Dashboards */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/caretaker" element={<CaretakerDashboard />} />

          {/* Shared Clinical Workspaces */}
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/devices" element={<DeviceManagementPage />} />
          <Route path="/simulator" element={<HardwareSimulatorPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          {/* Admin Only */}
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
