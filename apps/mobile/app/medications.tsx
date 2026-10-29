import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";

export default function MobileMedicationsScreen() {
  const [meds] = useState([
    {
      id: "m1",
      name: "Metoprolol Tartrate",
      dosage: "50mg",
      instructions: "Take 1 tablet every morning with breakfast.",
      slot: 1,
      mealRelation: "WITH_MEAL",
    },
    {
      id: "m2",
      name: "Metformin HCl",
      dosage: "500mg",
      instructions: "Take 1 tablet at noon with meal.",
      slot: 2,
      mealRelation: "AFTER_MEAL",
    },
    {
      id: "m3",
      name: "Lisinopril",
      dosage: "10mg",
      instructions: "Take 1 tablet in the evening. Keep blood pressure log.",
      slot: 3,
      mealRelation: "NO_MEAL_DEPENDENCY",
    },
    {
      id: "m4",
      name: "Atorvastatin",
      dosage: "20mg",
      instructions: "Take 1 tablet at bedtime.",
      slot: 4,
      mealRelation: "NO_MEAL_DEPENDENCY",
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Prescribed Regimens</Text>
        <Text style={styles.subtitle}>
          Authorized physician prescriptions mapped to physical carousel slots.
        </Text>

        {meds.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.medName}>{m.name}</Text>
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>Compartment #{m.slot}</Text>
              </View>
            </View>
            <Text style={styles.dosage}>Dosage: {m.dosage}</Text>
            <Text style={styles.instructions}>{m.instructions}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Protocol: {m.mealRelation.replace(/_/g, " ")}</Text>
            </View>
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
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  medName: { fontSize: 16, fontWeight: "800", color: "#102A43" },
  slotBadge: { backgroundColor: "#CCFBF1", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  slotBadgeText: { color: "#0F766E", fontSize: 11, fontWeight: "700" },
  dosage: { fontSize: 13, fontWeight: "700", color: "#0D9488", marginTop: 6 },
  instructions: { fontSize: 13, color: "#486581", marginTop: 4, lineHeight: 18 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 10,
  },
  tagText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
});

