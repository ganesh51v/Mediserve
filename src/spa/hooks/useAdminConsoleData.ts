import { useState, useEffect, useCallback } from "react";
import type { Patient, Device } from "../types";
import { apiFetch, parseJsonSafely } from "../hooks";

export interface AdminUserSummary {
  id: string;
  name: string;
  role: string;
}

export interface AdminDoctorSummary {
  id: string;
  userId: string;
  user: { name: string };
  specialty?: string;
  hospitalAffiliation?: string;
}

export interface AdminCaregiverSummary {
  id: string;
  userId: string;
  user: { name: string };
  certifications?: string;
  phone?: string;
}

export interface AdminRegistryData {
  patients: Patient[];
  doctors: AdminDoctorSummary[];
  caregivers: AdminCaregiverSummary[];
  devices: Device[];
  users: AdminUserSummary[];
}

export interface UseAdminConsoleDataReturn {
  data: AdminRegistryData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  assignCareTeam: (patientId: string, doctorId: string, caregiverId: string) => Promise<void>;
  provisionDevice: (serial: string, patientId?: string) => Promise<Device>;
}

/**
 * Custom data hook for the rebuilt MediServe Administrative Console.
 * Manages administrative data fetching, care team assignments, and hardware provisioning.
 */
export function useAdminConsoleData(): UseAdminConsoleDataReturn {
  const [data, setData] = useState<AdminRegistryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/admin/data");
      const json = await parseJsonSafely<AdminRegistryData>(res);
      if (!res.ok) {
        throw new Error((json as any)?.error || `Server responded with status ${res.status}`);
      }
      setData({
        patients: json.patients ?? [],
        doctors: json.doctors ?? [],
        caregivers: json.caregivers ?? [],
        devices: json.devices ?? [],
        users: json.users ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load administrative registry data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignCareTeam = async (patientId: string, doctorId: string, caregiverId: string): Promise<void> => {
    const res = await apiFetch("/api/admin/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        doctorId: doctorId || undefined,
        caregiverId: caregiverId || undefined,
      }),
    });
    const json = await parseJsonSafely<{ ok: boolean; error?: string }>(res);
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Failed to update care team assignments.");
    }
    // Re-fetch registry data to keep UI synchronized
    await loadData();
  };

  const provisionDevice = async (serial: string, patientId?: string): Promise<Device> => {
    const res = await apiFetch("/api/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serial: serial.trim(),
        patientId: patientId || null,
      }),
    });
    const json = await parseJsonSafely<{ ok: boolean; device: Device; error?: string }>(res);
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Failed to provision dispensary hardware unit.");
    }
    // Re-fetch registry data to reflect new device in fleet list
    await loadData();
    return json.device;
  };

  return {
    data,
    loading,
    error,
    reload: loadData,
    assignCareTeam,
    provisionDevice,
  };
}

