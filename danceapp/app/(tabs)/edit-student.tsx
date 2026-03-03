// app/edit-student.tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";

const BASE_URL = "http://192.168.29.150:5000";

export default function EditStudent() {
  // Use raw params to avoid TypeScript generic issues with expo-router
  const rawParams = useLocalSearchParams();
  const id = String(Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id || "");
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState("active");
  const [classType, setClassType] = useState("offline");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (id) loadStudent(); }, [id]);

  const loadStudent = async () => {
    try {
      const res = await axios.get(BASE_URL + "/students/" + id);
      const s = res.data;
      setName(s.name || "");
      setPhone(s.phone || "");
      setFee(String(s.monthly_fee || ""));
      setStatus(s.status || "active");
      setClassType(s.class_type || "offline");
    } catch (e: any) {
      console.log("Load error:", e?.message);
      Alert.alert("Error", "Failed to load student. Is server running at " + BASE_URL + "?");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert("Error", "Name is required"); return; }
    if (!fee.trim() || isNaN(Number(fee)) || Number(fee) <= 0) {
      Alert.alert("Error", "Enter a valid monthly fee");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim(), monthly_fee: Number(fee), status, class_type: classType };
      console.log("PUT /students/" + id, payload);
      const res = await axios.put(BASE_URL + "/students/" + id, payload);
      console.log("Response:", res.data);
      Alert.alert("Updated!", "Student saved successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || e?.message || "Unknown error";
      console.log("Save error:", errMsg, e?.response?.status);
      Alert.alert("Failed", "Could not update student: " + errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A67D8" />
        <Text style={{ marginTop: 10, color: "#718096" }}>Loading student...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Edit Student</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Student name"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
      />

      <Text style={styles.label}>Monthly Fee (Rs.) *</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={fee}
        onChangeText={setFee}
        placeholder="e.g. 700"
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, { marginRight: 10 }, status === "active" && styles.bgGreen]}
          onPress={() => setStatus("active")}
        >
          <Text style={[styles.toggleText, status === "active" && styles.toggleTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, status === "inactive" && styles.bgRed]}
          onPress={() => setStatus("inactive")}
        >
          <Text style={[styles.toggleText, status === "inactive" && styles.toggleTextActive]}>Inactive</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Class Type</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, { marginRight: 10 }, classType === "offline" && styles.bgBlue]}
          onPress={() => setClassType("offline")}
        >
          <Text style={[styles.toggleText, classType === "offline" && styles.toggleTextActive]}>Offline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, classType === "online" && styles.bgBlue]}
          onPress={() => setClassType("online")}
        >
          <Text style={[styles.toggleText, classType === "online" && styles.toggleTextActive]}>Online</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="white" />
          : <Text style={styles.btnText}>Update Student</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDF2F7", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#2C5282" },
  label: { fontWeight: "600", color: "#2D3748", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "white", padding: 13, borderRadius: 10,
    marginBottom: 4, fontSize: 15, borderWidth: 1, borderColor: "#E2E8F0"
  },
  toggleRow: { flexDirection: "row", marginBottom: 4, marginTop: 4 },
  toggleBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 13, borderRadius: 10, backgroundColor: "#E2E8F0"
  },
  bgGreen: { backgroundColor: "#38A169" },
  bgRed: { backgroundColor: "#E53E3E" },
  bgBlue: { backgroundColor: "#5A67D8" },
  toggleText: { fontWeight: "600", color: "#4A5568", fontSize: 14 },
  toggleTextActive: { color: "white" },
  btn: { backgroundColor: "#DD6B20", padding: 15, borderRadius: 12, marginTop: 24, alignItems: "center" },
  btnText: { color: "white", fontSize: 16, fontWeight: "600" },
});
