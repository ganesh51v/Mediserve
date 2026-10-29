/**
 * @mediserve/validation
 * Clinical schema and IoT hardware payload validators for MediServe.
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateScheduleInput(data: any): ValidationResult<{
  medicationId: string;
  compartmentId: number;
  times: string[];
  timezone: string;
  startDate: string;
  endDate?: string | null;
  confirmationWindowMinutes: number;
}> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Invalid schedule payload; object expected."] };
  }

  if (!data.medicationId || typeof data.medicationId !== "string") {
    errors.push("medicationId is required and must be a string.");
  }

  const compartment = Number(data.compartmentId ?? data.deviceSlot);
  if (isNaN(compartment) || compartment < 1 || compartment > 4) {
    errors.push("compartmentId must be an integer between 1 and 4.");
  }

  if (!Array.isArray(data.times) || data.times.length === 0) {
    errors.push("times must be a non-empty array of time strings in HH:MM format.");
  } else {
    for (const t of data.times) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
        errors.push(`Invalid time format '${t}'. Expected HH:MM (24-hour).`);
      }
    }
  }

  if (!data.timezone || typeof data.timezone !== "string") {
    errors.push("timezone is required (e.g. 'Asia/Kolkata', 'UTC').");
  }

  if (!data.startDate || isNaN(Date.parse(data.startDate))) {
    errors.push("startDate must be a valid ISO date string.");
  }

  if (data.endDate && isNaN(Date.parse(data.endDate))) {
    errors.push("endDate must be a valid ISO date string or null.");
  }

  const windowMins = Number(data.confirmationWindowMinutes ?? 30);
  if (isNaN(windowMins) || windowMins < 1 || windowMins > 120) {
    errors.push("confirmationWindowMinutes must be between 1 and 120.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      medicationId: data.medicationId,
      compartmentId: compartment,
      times: data.times,
      timezone: data.timezone,
      startDate: new Date(data.startDate).toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      confirmationWindowMinutes: windowMins,
    },
  };
}

export function validateDeviceEvent(data: any): ValidationResult<{
  eventId: string;
  deviceId: string;
  compartmentId: number;
  doseId?: string;
  eventType: string;
  occurredAt: string;
  source: string;
}> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Invalid device event payload."] };
  }

  if (!data.eventId || typeof data.eventId !== "string") {
    errors.push("eventId is required and must be a unique string.");
  }

  if (!data.deviceId || typeof data.deviceId !== "string") {
    errors.push("deviceId is required.");
  }

  const validTypes = [
    "REMINDER_TRIGGERED",
    "COMPARTMENT_UNLOCKED",
    "COMPARTMENT_OPENED",
    "LED_ACTIVATED",
    "BUZZER_ACTIVATED",
    "PATIENT_CONFIRMED",
    "COMPARTMENT_CLOSED",
    "DISPENSING_ERROR",
    "DEVICE_OFFLINE",
    "DEVICE_ONLINE",
  ];

  if (!data.eventType || !validTypes.includes(data.eventType)) {
    errors.push(`eventType must be one of: ${validTypes.join(", ")}`);
  }

  if (!data.occurredAt || isNaN(Date.parse(data.occurredAt))) {
    errors.push("occurredAt must be a valid ISO timestamp.");
  }

  const compId = Number(data.compartmentId ?? 1);
  const source = data.source === "ESP32_HARDWARE" ? "ESP32_HARDWARE" : "SIMULATOR";

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      eventId: data.eventId,
      deviceId: data.deviceId,
      compartmentId: isNaN(compId) ? 1 : compId,
      doseId: data.doseId,
      eventType: data.eventType,
      occurredAt: new Date(data.occurredAt).toISOString(),
      source,
    },
  };
}

