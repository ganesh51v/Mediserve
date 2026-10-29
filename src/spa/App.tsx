import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./hooks";

import { LoginRoute } from "./routes/LoginRoute";
import { RegisterRoute } from "./routes/RegisterRoute";
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
import { ProfileRoute } from "./routes/ProfileRoute";
import { CaregiverPatientEditorRoute } from "./routes/CaregiverPatientEditorRoute";

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

  // Clinical verification gating
  if (user.verificationStatus === "PENDING" && user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FA] p-4 text-[#102A43]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#D9E2EC] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 mb-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#102A43] mb-2">Verification In Progress</h2>
          <p className="text-xs text-[#627D98] mb-6 leading-relaxed">
            Your {user.role.toLowerCase()} credentials have been submitted and are pending administrative verification. Access to clinical patient charts and dispenser fleet management is restricted until clearance is approved.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("mediserve_clerk_token");
              navigate("/login", { replace: true });
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0B7A6F] cursor-pointer"
          >
            Return to Station Sign In
          </button>
        </div>
      </div>
    );
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
        {/* 1. Login & Registration (Public) */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />

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

        {/* 15. User Profile Management */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileRoute />
            </ProtectedRoute>
          }
        />

        {/* 16. Caregiver Patient Details Form Editor & Onboarding */}
        <Route
          path="/caregiver/patient-editor"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverPatientEditorRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/patient-editor/:id"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverPatientEditorRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/patients/manage"
          element={
            <ProtectedRoute allowedRoles={["CAREGIVER", "ADMIN"]}>
              <CaregiverPatientEditorRoute />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
