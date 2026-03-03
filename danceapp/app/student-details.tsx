// app/student-details.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";
const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Student = {
  id: number; name: string; phone: string;
  joining_date: string; monthly_fee: number;
  status: string; class_type: string;
};
type DueItem = {
  month: number; year: number; due: number;
  paid?: number; balance?: number; status: string;
};

export default function StudentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [dues, setDues] = useState<any>(null);
  const [attendSummary, setAttendSummary] = useState<any>(null);

  const today = new Date();

  useFocusEffect(useCallback(() => { if (id) load(); }, [id]));

  const load = async () => {
    try {
      const [s, d, a] = await Promise.all([
        axios.get(`${BASE_URL}/students/${id}`),
        axios.get(`${BASE_URL}/students/${id}/dues`),
        axios.get(`${BASE_URL}/attendance/summary/${id}?month=${today.getMonth()+1}&year=${today.getFullYear()}`),
      ]);
      setStudent(s.data);
      setDues(d.data);
      setAttendSummary(a.data);
    } catch (err) { console.log(err); }
  };

  if (!student || !dues) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Student Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{student.name}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={[styles.badge, student.status === "active" ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.badgeText}>{student.status}</Text>
            </View>
            <View style={[styles.badge, student.class_type === "online" ? styles.badgeBlue : styles.badgePurple]}>
              <Text style={styles.badgeText}>{student.class_type || "offline"}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.info}>📞 {student.phone || "N/A"}</Text>
        <Text style={styles.info}>📅 Joined: {student.joining_date?.slice(0,10)}</Text>
        <Text style={styles.info}>💰 Monthly Fee: ₹{student.monthly_fee}</Text>
      </View>

      {/* Attendance Summary */}
      {attendSummary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Attendance — {MONTHS[today.getMonth()+1]} {today.getFullYear()}
          </Text>
          <View style={styles.row3}>
            <View style={[styles.chip, { backgroundColor: "#C6F6D5" }]}>
              <Text style={styles.chipNum}>{attendSummary.present || 0}</Text>
              <Text style={styles.chipLabel}>Present</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: "#FED7D7" }]}>
              <Text style={styles.chipNum}>{attendSummary.absent || 0}</Text>
              <Text style={styles.chipLabel}>Absent</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: "#EBF8FF" }]}>
              <Text style={styles.chipNum}>{attendSummary.total || 0}</Text>
              <Text style={styles.chipLabel}>Total</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      
<View style={styles.btnGrid}>
        <ActionBtn label="Add Payment"   icon="cash-outline"            color="#38A169"
          onPress={() => router.push({ pathname: "/add-payment",     params: { id } })} />
        <ActionBtn label="Attendance"    icon="calendar-outline"        color="#3182CE"
          onPress={() => router.push({ pathname: "/attendance",      params: { id } })} />
        <ActionBtn label="Pay History"   icon="receipt-outline"         color="#805AD5"
          onPress={() => router.push({ pathname: "/payment-history", params: { id } })} />
        <ActionBtn label="Edit"          icon="create-outline"          color="#DD6B20"
          onPress={() => router.push({ pathname: "/edit-student",    params: { id } })} />
      </View>

      {/* Dues */}
      <View style={[styles.card, { backgroundColor: "#FFF5F5" }]}>
        <Text style={styles.sectionTitle}>Pending Dues</Text>
        <Text style={{ color: "#718096" }}>Pending Months: {dues.pendingCount}</Text>
        <Text style={styles.totalDue}>Total Due: ₹{dues.totalDue}</Text>
      </View>

      {dues.pendingMonths?.length > 0 ? (
        dues.pendingMonths.map((item: DueItem, i: number) => (
          <View key={i} style={[styles.monthRow, item.status === "partial" && { borderLeftColor: "#ECC94B", borderLeftWidth: 3 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.monthText}>{MONTHS[item.month]} {item.year}</Text>
              {item.status === "partial" && (
                <Text style={{ fontSize: 12, color: "#718096", marginTop: 3 }}>
                  Paid: ₹{item.paid}  |  Balance: ₹{item.balance}
                </Text>
              )}
            </View>
            <View style={[styles.badge, item.status === "partial" ? { backgroundColor: "#FEFCBF" } : styles.badgeRed]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={{ textAlign: "center", color: "#38A169", marginTop: 10, fontSize: 16 }}>
          No pending dues 🎉
        </Text>
      )}
    </ScrollView>
  );
}

function ActionBtn({ label, icon, color, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: color }]}>
      <Ionicons name={icon} size={18} color="white" />
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC", padding: 15 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "white", padding: 16, borderRadius: 14, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  name: { fontSize: 20, fontWeight: "bold", color: "#2B6CB0", flex: 1 },
  info: { color: "#4A5568", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#2D3748", marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#2D3748" },
  badgeGreen: { backgroundColor: "#C6F6D5" },
  badgeRed: { backgroundColor: "#FED7D7" },
  badgeBlue: { backgroundColor: "#BEE3F8" },
  badgePurple: { backgroundColor: "#E9D8FD" },
  row3: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  chipNum: { fontSize: 22, fontWeight: "bold", color: "#2D3748" },
  chipLabel: { fontSize: 12, color: "#718096", marginTop: 2 },
  btnGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  actionBtn: { flexBasis: "47%", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 13, borderRadius: 12, gap: 6 },
  actionBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  totalDue: { fontSize: 16, fontWeight: "bold", color: "#C53030", marginTop: 4 },
  monthRow: { backgroundColor: "white", padding: 14, borderRadius: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 1 },
  monthText: { fontWeight: "600", color: "#2D3748" },
});
