// app/add-student.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";

export default function AddStudent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fee, setFee] = useState("");
  const [classType, setClassType] = useState<"offline" | "online">("offline");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim() || !fee.trim()) {
      Alert.alert("Validation", "Name and Fee are required");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/students`, {
        name: name.trim(),
        phone: phone.trim(),
        joining_date: new Date().toISOString().slice(0, 10),
        monthly_fee: Number(fee),
        class_type: classType,
      });
      Alert.alert("Success", "Student added!");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to add student");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add New Student</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <Text style={styles.label}>Monthly Fee (Rs.) *</Text>
      <TextInput style={styles.input} placeholder="e.g. 700" keyboardType="numeric" value={fee} onChangeText={setFee} />

      <Text style={styles.label}>Class Type</Text>
      <View style={styles.toggleRow}>
        {(["offline", "online"] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, classType === t && styles.toggleActive]}
            onPress={() => setClassType(t)}
          >
            <Ionicons name={t === "online" ? "wifi" : "business"} size={16} color={classType === t ? "white" : "#4A5568"} />
            <Text style={[styles.toggleText, classType === t && styles.toggleTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={save} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Saving..." : "Save Student"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDF2F7", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#2C5282" },
  label: { fontWeight: "600", color: "#2D3748", marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: "white", padding: 13, borderRadius: 10, marginBottom: 14, fontSize: 15 },
  toggleRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 13, borderRadius: 10, backgroundColor: "#E2E8F0", gap: 8 },
  toggleActive: { backgroundColor: "#5A67D8" },
  toggleText: { fontWeight: "600", color: "#4A5568" },
  toggleTextActive: { color: "white" },
  btn: { backgroundColor: "#38A169", padding: 15, borderRadius: 12, marginTop: 4 },
  btnText: { color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" },
});
