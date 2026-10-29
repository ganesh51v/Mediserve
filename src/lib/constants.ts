export const ROLES = ["ADMIN", "DOCTOR", "CAREGIVER"] as const;
export type Role = (typeof ROLES)[number];

export const MEAL_RELATIONSHIPS = [
  "BEFORE_MEAL",
  "WITH_MEAL",
  "AFTER_MEAL",
  "EMPTY_STOMACH",
  "NO_MEAL_DEPENDENCY",
] as const;

export const MEAL_KINDS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export const MEAL_EVENT_TYPES = [
  "SCHEDULED",
  "REPORTED",
  "SENSOR_DETECTED",
  "CONFIRMED",
] as const;

export const MED_STATES = [
  "SCHEDULED",
  "DUE",
  "ELIGIBLE",
  "NOTIFIED",
  "DISPENSING",
  "DISPENSED",
  "CONFIRMED",
  "MISSED",
  "FAILED",
  "CANCELLED",
] as const;

export const ALERT_PRIORITIES = ["INFO", "WARNING", "URGENT"] as const;

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function mealLabel(kind: string) {
  return kind.charAt(0) + kind.slice(1).toLowerCase();
}

export function relationLabel(rel: string) {
  return rel
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ageFromDob(dob: Date | string) {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
