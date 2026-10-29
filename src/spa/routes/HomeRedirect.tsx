import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks";

export function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F7FA] px-4 text-center">
        <div className="h-2.5 w-2.5 rounded-full bg-[#0D9488] animate-pulse mb-4" />
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#0D9488] font-semibold">MediServe</p>
        <p className="mt-1 font-sans text-xl font-bold text-[#102A43]">Precision Healthcare Systems</p>
        <p className="mt-2 text-xs text-[#627D98] font-mono">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === "DOCTOR") {
    return <Navigate to="/doctor" replace />;
  }
  return <Navigate to="/caregiver" replace />;
}
