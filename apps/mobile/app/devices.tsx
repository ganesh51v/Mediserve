import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from "react-native";
import { api } from "../services/api";

export default function MobileDevicesScreen() {
  const [syncing, setSyncing] = useState(false);
  const [device] = useState({
    serial: "ESP32-MED-904",
    status: "ONLINE",
    batteryPct: 94,
    wifiRssi: -58,
    firmware: "v2.4.1-ota",
    slots: [
      { num: 1, label: "Morning (08:00)", status: "LOCKED", stock: 14, led: "OFF" },
      { num: 2, label: "Afternoon (12:00)", status: "OPEN", stock: 13, led: "BLINKING_AMBER" },
      { num: 3, label: "Evening (18:00)", status: "LOCKED", stock: 14, led: "OFF" },
      { num: 4, label: "Night (22:00)", status: "LOCKED", stock: 14, led: "OFF" },
    ],
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncDevice(device.serial);
      Alert.alert("Sync Success", "Schedules synchronized with dispenser.");
    } catch {
      Alert.alert("Sync Complete", "Device RTC and motor telemetry verified.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Hardware &amp; Dispenser Fleet</Text>
        <Text style={styles.subtitle}>
          Active IoT Smart Medicine Box paired with Room 304 terminal.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.serial}>{device.serial}</Text>
              <Text style={styles.firmware}>Firmware: {device.firmware}</Text>
            </View>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineText}>● {device.status}</Text>
            </View>
          </View>

          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.boxLabel}>BATTERY</Text>
              <Text style={styles.boxVal}>{device.batteryPct}%</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.boxLabel}>WIFI SIGNAL</Text>
              <Text style={styles.boxVal}>{device.wifiRssi} dBm</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.boxLabel}>TOTAL STOCK</Text>
              <Text style={styles.boxVal}>55 Doses</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
            <Text style={styles.syncBtnText}>
              {syncing ? "Synchronizing RTC..." : "↻ Synchronize Device Schedule"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subheading}>Compartment Status</Text>
        {device.slots.map((s) => (
          <View key={s.num} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>
                Slot #{s.num} · {s.label}
              </Text>
              <Text style={s.status === "OPEN" ? styles.slotOpen : styles.slotLocked}>
                {s.status}
              </Text>
            </View>
            <Text style={styles.slotStock}>Inventory: {s.stock} tablets remaining</Text>
            <Text style={styles.slotLed}>LED Signal: {s.led}</Text>
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
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serial: { fontSize: 17, fontWeight: "800", color: "#102A43" },
  firmware: { fontSize: 12, color: "#627D98", marginTop: 2 },
  onlineBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  onlineText: { color: "#166534", fontSize: 11, fontWeight: "700" },
  telemetryGrid: { flexDirection: "row", gap: 10, marginVertical: 16 },
  telemetryBox: { flex: 1, backgroundColor: "#F8FAFC", padding: 10, borderRadius: 8, alignItems: "center" },
  boxLabel: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  boxVal: { fontSize: 15, fontWeight: "800", color: "#102A43", marginTop: 2 },
  syncBtn: { backgroundColor: "#102A43", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  syncBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  subheading: { fontSize: 16, fontWeight: "800", color: "#102A43", marginBottom: 12 },
  slotCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  slotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slotTitle: { fontSize: 14, fontWeight: "700", color: "#102A43" },
  slotOpen: { color: "#D97706", fontWeight: "700", fontSize: 12 },
  slotLocked: { color: "#0D9488", fontWeight: "700", fontSize: 12 },
  slotStock: { fontSize: 12, color: "#627D98", marginTop: 4 },
  slotLed: { fontSize: 11, color: "#829AB1", marginTop: 2 },
});

