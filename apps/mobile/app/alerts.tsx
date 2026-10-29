import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from "react-native";

export default function MobileAlertsScreen() {
  const [alerts, setAlerts] = useState([
    {
      id: "a1",
      priority: "CRITICAL",
      title: "Missed Dose Escalation: Metformin HCl",
      body: "Eleanor Vance (Room 304) has not confirmed noon dose after 15-min timeout window.",
      time: "12:15 PM",
      acknowledged: false,
    },
    {
      id: "a2",
      priority: "WARNING",
      title: "Low Carousel Inventory",
      body: "Compartment 3 (Lisinopril) has 2 doses remaining. Refill required within 48h.",
      time: "10:00 AM",
      acknowledged: true,
    },
  ]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    Alert.alert("Alert Acknowledged", "Audit log updated. Secondary escalation suspended.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Clinical Alerts &amp; Escalations</Text>
        <Text style={styles.subtitle}>
          Real-time push notifications for delayed, missed, or hardware exception events.
        </Text>

        {alerts.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              item.priority === "CRITICAL" ? styles.criticalBorder : styles.warningBorder,
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.badge,
                  item.priority === "CRITICAL" ? styles.criticalBadge : styles.warningBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.priority === "CRITICAL" ? styles.criticalText : styles.warningText,
                  ]}
                >
                  {item.priority}
                </Text>
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>

            <Text style={styles.alertTitle}>{item.title}</Text>
            <Text style={styles.alertBody}>{item.body}</Text>

            {!item.acknowledged ? (
              <TouchableOpacity
                style={styles.ackButton}
                onPress={() => handleAcknowledge(item.id)}
              >
                <Text style={styles.ackButtonText}>Acknowledge &amp; Dispatch Caregiver →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.resolvedRow}>
                <Text style={styles.resolvedText}>✓ Acknowledged by Nurse Patel</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FA" },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#102A43", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#627D98", marginBottom: 20, lineHeight: 18 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
  },
  criticalBorder: { borderLeftColor: "#DC2626" },
  warningBorder: { borderLeftColor: "#D97706" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  criticalBadge: { backgroundColor: "#FEE2E2" },
  warningBadge: { backgroundColor: "#FEF3C7" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  criticalText: { color: "#DC2626" },
  warningText: { color: "#D97706" },
  time: { fontSize: 11, color: "#829AB1" },
  alertTitle: { fontSize: 15, fontWeight: "700", color: "#102A43", marginTop: 8 },
  alertBody: { fontSize: 13, color: "#486581", marginTop: 4, lineHeight: 18 },
  ackButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 14,
  },
  ackButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  resolvedRow: { marginTop: 12 },
  resolvedText: { color: "#166534", fontSize: 12, fontWeight: "600" },
});

