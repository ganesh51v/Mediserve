import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { api, setMobileAuthToken } from "../services/api";

export default function MobileLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("caregiver@mediserve.local");
  const [password, setPassword] = useState("MediServe!23");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter institutional email and passcode.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.token) {
        setMobileAuthToken(res.token);
      }
      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("dashboard");
      }
    } catch (err: any) {
      Alert.alert("Authentication Failed", err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (role: "caregiver" | "doctor" | "admin") => {
    if (role === "caregiver") {
      setEmail("caregiver@mediserve.local");
    } else if (role === "doctor") {
      setEmail("doctor@mediserve.local");
    } else {
      setEmail("admin@mediserve.local");
    }
    setPassword("MediServe!23");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MediServe Mobile</Text>
        </View>
        <Text style={styles.title}>Clinical Workstation</Text>
        <Text style={styles.subtitle}>
          Sign in to monitor patient dispensing, configure reminders, and receive dose escalation alerts.
        </Text>
      </View>

      <View style={styles.personaRow}>
        <TouchableOpacity
          style={styles.personaButton}
          onPress={() => selectPersona("caregiver")}
        >
          <Text style={styles.personaText}>Nurse / Caregiver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.personaButton}
          onPress={() => selectPersona("doctor")}
        >
          <Text style={styles.personaText}>Doctor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Institutional Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@mediserve.local"
        />

        <Text style={styles.label}>Security Passcode</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Enter Gateway →</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Authorized hospital personnel only · 21 CFR Part 11 logged
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
    justifyContent: "space-between",
    padding: 24,
  },
  header: {
    marginTop: 32,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#0D9488",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#627D98",
    lineHeight: 20,
  },
  personaRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 16,
  },
  personaButton: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  personaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102A43",
  },
  form: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#102A43",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334E68",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9E2EC",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#F8FAFC",
  },
  primaryButton: {
    backgroundColor: "#0D9488",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    color: "#829AB1",
  },
});

