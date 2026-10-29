import { useState, useEffect, useCallback } from "react";
import type {
  SessionUser,
  Alert,
  Notification,
  Device,
  MedicationEvent,
  AuditLog,
  Patient,
} from "./types";
import { CLERK_ENABLED, setDevToken, clearToken } from "./auth/clerk";


const TOKEN_STORAGE_KEY = "mediserve_clerk_token";

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Returns the active session token regardless of auth mode.
 *  - Clerk mode: reads window.__clerk_token (kept fresh by ClerkSessionSync)
 *  - Dev mode:   reads localStorage (set after our own login endpoint)
 */
export function getClerkToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Clerk session token (set by ClerkSessionSync if signed into Clerk)
  if ((window as any).__clerk_token) {
    return (window as any).__clerk_token;
  }

  // 2. Direct clinic session token stored in localStorage
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) return stored;

  // 3. Legacy cookie fallback
  const cookieClerk = document.cookie.match(/(?:^|;\s*)__session=([^;]+)/);
  if (cookieClerk) return decodeURIComponent(cookieClerk[1]);

  const cookieLegacy = document.cookie.match(/(?:^|;\s*)mediserve_session=([^;]+)/);
  if (cookieLegacy) return decodeURIComponent(cookieLegacy[1]);

  return null;
}

/** Sets the session token in localStorage. */
export function setClerkToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

const API_BASE = (
  typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL)
    : ""
).replace(/\/$/, "");

export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (API_BASE && path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

/**
 * Fetch wrapper that attaches the active session token to every request.
 * Works in both Clerk mode and dev mode transparently.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getClerkToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const resolvedInput = typeof input === "string" ? resolveApiUrl(input) : input;
  return fetch(resolvedInput, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}


// ─── useAuth hook ─────────────────────────────────────────────────────────────

/**
 * Unified auth hook.
 *
 * Dev mode:  calls /api/auth/me with our own JWT → returns SessionUser with role.
 * Clerk mode: reads the Clerk session via ClerkSessionSync (which writes the
 *             token to window.__clerk_token), then calls /api/auth/me so the
 *             Express backend can resolve the Clerk userId → role mapping.
 */
export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        if (!data.user && !CLERK_ENABLED) {
          setClerkToken(null);
        }
      } else {
        setUser(null);
        if (!CLERK_ENABLED) setClerkToken(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch session");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    if (data.token) {
      setClerkToken(data.token);
    }
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      await clearToken();
      setUser(null);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    refresh: fetchMe,
    isSignedIn: Boolean(user),
    isLoaded: !loading,
  };
}


export function useCaregiverDashboard() {
  const [data, setData] = useState<{
    patients: Array<{
      patient: Patient;
      adherence: number;
      attention: boolean;
      status: string;
      progress: { completed: number; total: number; ratePct: number; missed: number };
      alerts: number;
    }>;
    totals: {
      total: number;
      attention: number;
      eventsToday: number;
      missedToday: number;
      activeAlerts: number;
      deviceProblems: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/caregiver/dashboard");
      if (!res.ok) throw new Error("Failed to load caregiver dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function usePatientProfile(patientId: string, role = "CAREGIVER") {
  const [data, setData] = useState<{
    patient: Patient;
    progress: { completed: number; total: number; ratePct: number; missed: number };
    week: { taken: number; missed: number; delayed: number; failed: number; total: number; ratePct: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const endpoint =
        role === "DOCTOR"
          ? `/api/doctor/patient/${patientId}`
          : `/api/caregiver/patient/${patientId}`;
      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error("Failed to load patient profile");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading profile");
    } finally {
      setLoading(false);
    }
  }, [patientId, role]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useDoctorOverview() {
  const [rows, setRows] = useState<
    Array<{
      patient: Patient;
      adherence: number;
      missed: number;
      delayed: number;
      events: number;
      alerts: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/doctor/overview");
      if (!res.ok) throw new Error("Failed to load doctor overview");
      const json = await res.json();
      setRows(json.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to load alerts");
      const json = await res.json();
      setAlerts(json.alerts ?? []);
      setNotifications(json.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const acknowledge = async (alertId: string) => {
    const res = await apiFetch("/api/alerts/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to acknowledge");
    }
    await load();
  };

  return { alerts, notifications, loading, error, reload: load, acknowledge };
}

export function useReports() {
  const [bundles, setBundles] = useState<
    Array<{
      patient: Patient;
      report: {
        med: { taken: number; missed: number; delayed: number; failed: number; ratePct: number; total?: number };
        measurements: Array<{ id: string; type: string; value: string; unit: string; status: string }>;
        alerts: Alert[];
        device: Device | null;
        dispensing: unknown[];
      };
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      const json = await res.json();
      setBundles(json.bundles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { bundles, loading, error, reload: load };
}

export function useAdminDirectory() {
  const [data, setData] = useState<{
    patients: Patient[];
    doctors: Array<{ id: string; user: { name: string }; specialty?: string }>;
    caregivers: Array<{ id: string; user: { name: string } }>;
    devices: Device[];
    users: Array<{ id: string; name: string; role: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/admin/data");
      if (!res.ok) throw new Error("Failed to load admin data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (patientId: string, doctorId: string, caregiverId: string) => {
    const res = await apiFetch("/api/admin/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, doctorId, caregiverId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to assign");
    }
    await load();
  };

  const registerDevice = async (serial: string, patientId: string) => {
    const res = await apiFetch("/api/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, patientId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to register device");
    }
    await load();
  };

  return { data, loading, error, reload: load, assign, registerDevice };
}

export function useAdminDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/admin/devices");
      if (!res.ok) throw new Error("Failed to load devices");
      const json = await res.json();
      setDevices(json.devices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { devices, loading, error, reload: load };
}

export function useAdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/admin/audit");
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      setLogs(json.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, loading, error, reload: load };
}

export function useSimulator() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [pending, setPending] = useState<MedicationEvent[]>([]);
  const [messagesByDevice, setMessagesByDevice] = useState<
    Record<string, Array<{ topic: string; payload: string; timestamp: Date }>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/simulator/data");
      if (!res.ok) throw new Error("Failed to load simulator data");
      const json = await res.json();
      setDevices(json.devices ?? []);
      setPending(json.pending ?? []);
      setMessagesByDevice(json.messagesByDevice ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading simulator");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tick = async (deviceId?: string) => {
    const res = await apiFetch("/api/simulator/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) throw new Error("Tick failed");
    await load();
  };

  const setState = async (deviceId: string, state: string) => {
    const res = await apiFetch("/api/simulator/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, state }),
    });
    if (!res.ok) throw new Error("State update failed");
    await load();
  };

  const confirm = async (deviceId: string) => {
    const res = await apiFetch("/api/simulator/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) throw new Error("Confirm failed");
    await load();
  };

  const triggerDose = async (deviceId: string) => {
    const res = await apiFetch("/api/simulator/trigger-dose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) throw new Error("Trigger dose failed");
    await load();
  };

  const refill = async (deviceId: string) => {
    const res = await apiFetch("/api/simulator/refill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) throw new Error("Refill failed");
    await load();
  };

  const setBattery = async (deviceId: string, batteryPct: number) => {
    const res = await apiFetch("/api/simulator/battery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, batteryPct }),
    });
    if (!res.ok) throw new Error("Battery update failed");
    await load();
  };

  return {
    devices,
    pending,
    messagesByDevice,
    loading,
    error,
    reload: load,
    tick,
    setState,
    confirm,
    triggerDose,
    refill,
    setBattery,
  };
}

export function useMealActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordMeal = async (opts: {
    patientId: string;
    kind: string;
    eventType: string;
    source?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record meal");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording meal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { recordMeal, loading, error };
}

export function usePlanActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = async (opts: {
    patientId: string;
    medicine: string;
    dosage: string;
    frequency: string;
    scheduledTime: string;
    startDate: string;
    endDate?: string | null;
    mealRelationship: string;
    mealKind?: string | null;
    deviceSlot: number;
    instructions: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create medication plan");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating plan");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPlan, loading, error };
}

export function useNoteActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addNote = async (patientId: string, body: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, body }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add clinical note");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding note");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { addNote, loading, error };
}

export function useDevicePairing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pairDevice = async (patientId: string, serial: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/patients/${patientId}/pair-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to pair device");
      }
      return await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to pair device";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unpairDevice = async (patientId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/patients/${patientId}/unpair-device`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to unpair device");
      }
      return await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unpair device";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { pairDevice, unpairDevice, loading, error };
}
