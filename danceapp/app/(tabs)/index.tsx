// app/(tabs)/index.tsx
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";

type Student = {
  id: number;
  name: string;
  phone: string;
  monthly_fee: number;
  status: string;
  class_type: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  useFocusEffect(
    useCallback(() => { loadStudents(); }, [])
  );

  const loadStudents = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`${BASE_URL}/students`);
      setStudents(res.data);
    } catch {
      Alert.alert("Error", "Failed to load students");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let list = students;
    if (filterStatus !== "all") list = list.filter(s => s.status === filterStatus);
    if (search.trim()) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search)
      );
    }
    setFiltered(list);
  }, [students, search, filterStatus]);

  const confirmDelete = (student: Student) => {
    Alert.alert(
      "Delete Student",
      `Delete "${student.name}"? All payments and attendance will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteStudent(student.id) },
      ]
    );
  };

  const deleteStudent = async (id: number) => {
    try {
      await axios.delete(`${BASE_URL}/students/${id}`);
      loadStudents();
    } catch {
      Alert.alert("Error", "Failed to delete student");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1 }}
          placeholder="Search by name or phone..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(["all", "active", "inactive"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filterStatus === f && styles.filterActive]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[styles.filterText, filterStatus === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/add-student")}>
        <Ionicons name="person-add" size={18} color="white" />
        <Text style={styles.addText}>  Add Student</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStudents} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="people-outline" size={48} color="#CBD5E0" />
            <Text style={{ color: "#A0AEC0", marginTop: 10 }}>No students found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/student-details", params: { id: item.id } })}
          >
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>📞 {item.phone || "N/A"}</Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.badge, item.status === "active" ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </View>
                  <View style={[styles.badge, item.class_type === "online" ? styles.badgeOnline : styles.badgeOffline]}>
                    <Text style={styles.badgeText}>{item.class_type || "offline"}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.feeText}>₹{item.monthly_fee}/month</Text>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA", padding: 15 },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, elevation: 2,
  },
  filterRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "#E2E8F0" },
  filterActive: { backgroundColor: "#5A67D8" },
  filterText: { color: "#4A5568", fontSize: 13 },
  filterTextActive: { color: "white" },
  addBtn: {
    backgroundColor: "#5A67D8", padding: 14, borderRadius: 10,
    marginBottom: 15, flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  addText: { color: "white", fontSize: 16, fontWeight: "600" },
  card: { backgroundColor: "white", padding: 15, borderRadius: 14, marginBottom: 12, elevation: 3 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 17, fontWeight: "bold", color: "#2D3748" },
  sub: { color: "#718096", fontSize: 13, marginTop: 3 },
  feeText: { fontSize: 15, fontWeight: "600", color: "#2B6CB0" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 2 },
  badgeActive: { backgroundColor: "#C6F6D5" },
  badgeInactive: { backgroundColor: "#FED7D7" },
  badgeOnline: { backgroundColor: "#BEE3F8" },
  badgeOffline: { backgroundColor: "#E9D8FD" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#2D3748" },
  deleteBtn: { padding: 6 },
});
