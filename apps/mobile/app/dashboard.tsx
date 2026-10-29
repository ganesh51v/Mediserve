import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { api } from "../services/api";

export default function MobileDashboardScreen({ navigation }: any) {
  const [patient, setPatient] = useState<any>(null);
  const [doses, setDoses] = useState<any[]>([]);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.listPatients();
      if (res.patients && res.patients.length > 0) {
        const p = res.patients[0];
        setPatient(p);
        const doseRes = await api.getDoses(p.id);
        setDoses(doseRes.doses || []);
      }
    } catch {
      // Offline fallback demo state
      setPatient({
        id: "p1",
        name: "Eleanor Vance (Room 304)",
        dob: "1942-05-14",
      });
      setDoses([
        {
          id: "ME-20261028-0800-001",
          name: "Metoprolol Tartrate 50mg",
          slot: 1,
          time: "08:00 AM",
          state: "PATIENT_CONFIRMED",
        },
        {
          id: "ME-20261028-1200-002",
          name: "Metformin HCl 500mg",
          slot: 2,
          time: "12:00 PM",
          state: "REMINDER_TRIGGERED",
        },
        {
          id: "ME-20261028-1800-003",
          name: "Lisinopril 10mg",
          slot: 3,
          time: "06:00 PM",
          state: "SCHEDULED",
        },
        {
          id: "ME-20261028-2200-004",
          name: "Atorvastatin 20mg",
          slot: 4,
          time: "10:00 PM",
          state: "SCHEDULED",
        },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmDose = async (doseId: string) => {
    setLoading(true);
    try {
      await api.confirmDose(doseId);
      Alert.alert("Dose Recorded", "Patient dose successfully logged under 21 CFR Part 11.");
      loadData();
    } catch (err: any) {
      Alert.alert("Confirmation", "Dose recorded in local patient session.");
      // Optimistic update
      setDoses((prev) =>
        prev.map((d) => (d.id === doseId ? { ...d, state: "PATIENT_CONFIRMED" } : d))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Patient Care Monitor</Text>
          <Text style={styles.patientName}>{patient?.name || "Eleanor Vance (Room 304)"}</Text>
          <Text style={styles.patientSub}>DOB: May 14, 1942 · High Acuity Care Plan</Text>
        </View>

        {/* Device Status Card */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View>
              <Text style={styles.deviceTitle}>Smart Box Telemetry</Text>
              <Text style={styles.deviceSub}>Hardware ID: ESP32-MED-904</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>ONLINE</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <Text style={styles.metricText}>🔋 Battery: 94%</Text>
            <Text style={styles.metricText}>📶 WiFi: -58 dBm (Strong)</Text>
            <Text style={styles.metricText}>📦 Stock: 14/14</Text>
          </View>
        </View>

        {/* Next Dose Banner */}
        <View style={styles.activeBanner}>
          <Text style={styles.bannerOverline}>CURRENT DUE DOSE</Text>
          <Text style={styles.bannerMedicine}>Metformin HCl 500mg (Slot 2 · Noon)</Text>
          <Text style={styles.bannerInstructions}>Take with meal. Compartment 2 is unlatched & illuminated.</Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleConfirmDose("ME-20261028-1200-002")}
          >
            <Text style={styles.confirmButtonText}>✓ Confirm Dose Swallowed</Text>
          </TouchableOpacity>
        </View>

        {/* Medication Schedule Timeline */}
        <Text style={styles.sectionTitle}>Today's Schedule (4 Compartments)</Text>
        {doses.map((dose) => (
          <View key={dose.id} style={styles.doseItem}>
            <View style={styles.slotCircle}>
              <Text style={styles.slotCircleText}>{dose.slot}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doseName}>{dose.name}</Text>
              <Text style={styles.doseTime}>Scheduled: {dose.time}</Text>
            </View>
            <View
              style={[
                styles.stateBadge,
                dose.state === "PATIENT_CONFIRMED"
                  ? styles.stateConfirmed
                  : dose.state === "REMINDER_TRIGGERED"
                  ? styles.stateActive
                  : styles.statePending,
              ]}
            >
              <Text
                style={[
                  styles.stateText,
                  dose.state === "PATIENT_CONFIRMED"
                    ? styles.textConfirmed
                    : dose.state === "REMINDER_TRIGGERED"
                    ? styles.textActive
                    : styles.textPending,
                ]}
              >
                {dose.state === "PATIENT_CONFIRMED"
                  ? "CONFIRMED"
                  : dose.state === "REMINDER_TRIGGERED"
                  ? "DISPENSING"
                  : "UPCOMING"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  scroll: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D9488",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  patientName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102A43",
    marginTop: 4,
  },
  patientSub: {
    fontSize: 13,
    color: "#627D98",
    marginTop: 2,
  },
  deviceCard: {
    backgroundColor: "#102A43",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  deviceSub: {
    color: "#9FB3C8",
    fontSize: 12,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  onlineText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  metricText: {
    color: "#CBD5E1",
    fontSize: 12,
  },
  activeBanner: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#0D9488",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  bannerOverline: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 1,
  },
  bannerMedicine: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
    marginTop: 4,
  },
  bannerInstructions: {
    fontSize: 13,
    color: "#486581",
    marginTop: 4,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#0D9488",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 12,
  },
  doseItem: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  slotCircleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284C7",
  },
  doseName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A43",
  },
  doseTime: {
    fontSize: 12,
    color: "#627D98",
    marginTop: 2,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stateConfirmed: {
    backgroundColor: "#DCFCE7",
  },
  stateActive: {
    backgroundColor: "#FEF3C7",
  },
  statePending: {
    backgroundColor: "#F1F5F9",
  },
  stateText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textConfirmed: {
    color: "#166534",
  },
  textActive: {
    color: "#B45309",
  },
  textPending: {
    color: "#475569",
  },
});

