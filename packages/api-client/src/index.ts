/**
 * @mediserve/api-client
 * Isomorphic TypeScript REST client for MediServe API v1.
 * Works seamlessly across Web (React/Vite) and Mobile (React Native/Expo).
 */

export interface ClientConfig {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

export class MediServeApiClient {
  private baseUrl: string;
  private getToken?: () => string | null | Promise<string | null>;
  private onUnauthorized?: () => void;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (this.getToken) {
      const token = await this.getToken();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return data as T;
  }

  // ─── Module 1: Auth & User ──────────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.request<{ ok: boolean; user: any; token: string; redirect?: string }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  }

  async register(payload: { name: string; email: string; password: string; role: string }) {
    return this.request<{ ok: boolean; user: any; token: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async logout() {
    return this.request<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" });
  }

  async getSession() {
    return this.request<{ user: any }>("/api/v1/auth/me");
  }

  // ─── Module 2: Patients & Medications ───────────────────────────────────────
  async listPatients() {
    return this.request<{ patients: any[] }>("/api/v1/patients");
  }

  async getPatient(id: string) {
    return this.request<{ patient: any }>("/api/v1/patients/" + id);
  }

  async createPatient(payload: { fullName: string; dateOfBirth: string; timezone: string }) {
    return this.request<{ patient: any }>("/api/v1/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listMedications(patientId: string) {
    return this.request<{ medications: any[] }>(`/api/v1/patients/${patientId}/medications`);
  }

  async addMedication(patientId: string, payload: {
    name: string;
    dosage: string;
    instructions: string;
    mealRelation: string;
  }) {
    return this.request<{ medication: any }>(`/api/v1/patients/${patientId}/medications`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ─── Module 3: Schedules & Doses ────────────────────────────────────────────
  async createSchedule(medicationId: string, payload: {
    compartmentId: number;
    times: string[];
    timezone: string;
    startDate: string;
    endDate?: string | null;
    confirmationWindowMinutes?: number;
  }) {
    return this.request<{ schedule: any; generatedDosesCount: number }>(
      `/api/v1/medications/${medicationId}/schedules`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  }

  async updateSchedule(scheduleId: string, updates: Partial<{
    times: string[];
    active: boolean;
    confirmationWindowMinutes: number;
  }>) {
    return this.request<{ schedule: any }>(`/api/v1/schedules/${scheduleId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async getDoses(patientId: string) {
    return this.request<{ doses: any[] }>(`/api/v1/patients/${patientId}/doses`);
  }

  async confirmDose(doseId: string, idempotencyKey?: string) {
    return this.request<{ ok: boolean; dose: any }>(`/api/v1/doses/${doseId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: idempotencyKey || `CONF-${Date.now()}` }),
    });
  }

  // ─── Module 4: Devices & Simulator ──────────────────────────────────────────
  async getDevice(deviceId: string) {
    return this.request<{ device: any }>(`/api/v1/devices/${deviceId}`);
  }

  async syncDevice(deviceId: string) {
    return this.request<{ ok: boolean; syncedAt: string }>(`/api/v1/devices/${deviceId}/sync`, {
      method: "POST",
    });
  }

  async ingestDeviceEvent(event: {
    eventId: string;
    deviceId: string;
    compartmentId: number | string;
    doseId?: string;
    eventType: string;
    occurredAt: string;
    source: "SIMULATOR" | "ESP32_HARDWARE";
  }) {
    return this.request<{ ok: boolean; event: any }>("/api/v1/devices/" + event.deviceId + "/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  // ─── Module 5: Analytics & Reports ──────────────────────────────────────────
  async getAdherence(patientId: string) {
    return this.request<{ adherence: any }>(`/api/v1/patients/${patientId}/adherence`);
  }

  async getReports(patientId: string) {
    return this.request<{ reports: any[] }>(`/api/v1/patients/${patientId}/reports`);
  }

  // ─── Module 6: Notifications ────────────────────────────────────────────────
  async listNotifications() {
    return this.request<{ notifications: any[] }>("/api/v1/notifications");
  }

  async markNotificationRead(id: string) {
    return this.request<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
    });
  }
}

