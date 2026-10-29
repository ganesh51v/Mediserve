type Command = { type: string; eventId?: string; slot?: number };

type Message = { topic: string; payload: string; at: string };

const bus: Message[] = [];
const MAX = 200;

export function topic(deviceId: string, kind: "status" | "command" | "event" | "telemetry" | "error") {
  return `device/${deviceId}/${kind}`;
}

export function publish(t: string, payload: object | string) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  bus.unshift({ topic: t, payload: body, at: new Date().toISOString() });
  if (bus.length > MAX) bus.pop();
}

export async function publishCommand(deviceId: string, command: Command) {
  publish(topic(deviceId, "command"), command);
}

export function recentMessages(deviceId?: string) {
  if (!deviceId) return bus.slice(0, 40);
  return bus.filter((m) => m.topic.includes(`device/${deviceId}/`)).slice(0, 40);
}

/**
 * In-process MQTT topic bus for the prototype.
 * Physical ESP32 units should connect with MQTT/TLS to the same topic layout:
 *   device/{id}/status|command|event|telemetry|error
 * Telemetry must not include unnecessary patient information.
 */
export function gatewayNotes() {
  return {
    path: "App → Backend → Device Gateway → MQTT/TLS → ESP32",
    topics: [
      "device/{id}/status",
      "device/{id}/command",
      "device/{id}/event",
      "device/{id}/telemetry",
      "device/{id}/error",
    ],
  };
}
