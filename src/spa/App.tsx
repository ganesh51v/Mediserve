import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./hooks";

import { LoginRoute } from "./routes/LoginRoute";
import { HomeRedirect } from "./routes/HomeRedirect";
import { CaregiverDashboardRoute } from "./routes/CaregiverDashboardRoute";
import { CaregiverPatientRoute } from "./routes/CaregiverPatientRoute";
import { CaregiverAlertsRoute } from "./routes/CaregiverAlertsRoute";
import { CaregiverReportsRoute } from "./routes/CaregiverReportsRoute";
import { DoctorOverviewRoute } from "./routes/DoctorOverviewRoute";
import { DoctorPatientRoute } from "./routes/DoctorPatientRoute";
import { AdminDirectoryRoute } from "./routes/AdminDirectoryRoute";
import { AdminAuditRoute } from "./routes/AdminAuditRoute";
import { AdminDevicesRoute } from "./routes/AdminDevicesRoute";
import { SimulatorRoute } from "./routes/SimulatorRoute";

/**
 * Route guard component that enforces Clerk authentication and role-based access.
 * Unauthenticated users are routed to /login.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-muted">
        Loading MediServe...
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home =
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "DOCTOR"
        ? "/doctor"
        : "/caregiver";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-muted">
        Loading MediServe...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Login (Public) */}
        <Route path="/login" element={<LoginRoute />} />

        {/* 2. Root Redirect */}
        <Route path="/" element={<HomeRedirect />} />

        {/* 3. Caregiver Dashboard */}
        <Route
          path="/caregiver"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverDashboardRoute />
            </ProtectedRoute>
          }
        />

        {/* 4. Caregiver Patient Detail */}
        <Route
          path="/caregiver/patients/:id"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverPatientRoute />
            </ProtectedRoute>
          }
        />

        {/* 5. Caregiver Alerts */}
        <Route
          path="/caregiver/alerts"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverAlertsRoute />
            </ProtectedRoute>
          }
        />

        {/* 6. Caregiver Reports */}
        <Route
          path="/caregiver/reports"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverReportsRoute title="Reports" />
            </ProtectedRoute>
          }
        />

        {/* 7. Doctor Dashboard */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]}>
              <DoctorOverviewRoute />
            </ProtectedRoute>
          }
        />

        {/* 8. Doctor Patient Detail */}
        <Route
          path="/doctor/patients/:id"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]}>
              <DoctorPatientRoute />
            </ProtectedRoute>
          }
        />

        {/* 9. Doctor Alerts */}
        <Route
          path="/doctor/alerts"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]}>
              <CaregiverAlertsRoute />
            </ProtectedRoute>
          }
        />

        {/* 10. Doctor Reports */}
        <Route
          path="/doctor/reports"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]}>
              <CaregiverReportsRoute title="Reports" />
            </ProtectedRoute>
          }
        />

        {/* 11. Admin Directory */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDirectoryRoute />
            </ProtectedRoute>
          }
        />

        {/* 12. Admin Audit Log */}
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminAuditRoute />
            </ProtectedRoute>
          }
        />

        {/* 13. Admin Devices Fleet */}
        <Route
          path="/admin/devices"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDevicesRoute />
            </ProtectedRoute>
          }
        />

        {/* 14. Hardware Simulator */}
        <Route
          path="/simulator"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "CAREGIVER", "DOCTOR"]}>
              <SimulatorRoute />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
