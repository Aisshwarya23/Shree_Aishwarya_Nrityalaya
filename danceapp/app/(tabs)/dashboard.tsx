// app/(tabs)/dashboard.tsx
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";
const MONTH_SHORT = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type MonthIncome = {
  year: number;
  month: number;
  total_collected: number;
  total_balance: number;
  payment_count: number;
};

type StudentIncome = {
  id: number;
  name: string;
  class_type: string;
  status: string;
  monthly_fee: number;
  total_paid: number;
  total_balance: number;
  payment_count: number;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  online: number;
  offline: number;
  totalDue: number;
  totalCollected: number;
  totalBalance: number;
};

type Tab = "overview" | "monthly" | "students";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab]                   = useState<Tab>("overview");
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [stats, setStats]               = useState<Stats>({
    total: 0, active: 0, inactive: 0,
    online: 0, offline: 0,
    totalDue: 0, totalCollected: 0, totalBalance: 0,
  });
  const [monthIncome, setMonthIncome]   = useState<MonthIncome[]>([]);
  const [studentIncome, setStudentIncome] = useState<StudentIncome[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [studentsRes, monthRes, studentIncomeRes] = await Promise.all([
        axios.get(`${BASE_URL}/students`, { timeout: 8000 }),
        axios.get(`${BASE_URL}/income/monthly`, { timeout: 8000 }),
        axios.get(`${BASE_URL}/income/by-student`, { timeout: 8000 }),
      ]);

      const students = studentsRes.data;
      const active   = students.filter((s: any) => s.status === "active").length;
      const online   = students.filter((s: any) => s.class_type === "online").length;

      // Aggregate totals from monthly income
      const allMonths: MonthIncome[] = monthRes.data;
      const totalCollected = allMonths.reduce((s, m) => s + Number(m.total_collected), 0);
      const totalBalance   = allMonths.reduce((s, m) => s + Number(m.total_balance), 0);

      // Total dues — sum of per-student dues
      const duesRes = await Promise.all(
        students.map((s: any) =>
          axios.get(`${BASE_URL}/students/${s.id}/dues`, { timeout: 8000 })
            .then(r => r.data.totalDue || 0)
            .catch(() => 0)
        )
      );
      const totalDue = duesRes.reduce((a: number, b: number) => a + b, 0);

      setStats({
        total: students.length, active,
        inactive: students.length - active,
        online, offline: students.length - online,
        totalDue, totalCollected, totalBalance,
      });
      setMonthIncome(allMonths);
      setStudentIncome(studentIncomeRes.data);
    } catch (e) {
      console.log("Dashboard load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const today = new Date();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A67D8" />
        <Text style={{ marginTop: 10, color: "#718096" }}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Dashboard</Text>
          <Text style={styles.sub}>
            {today.toLocaleString("default", { month: "long" })} {today.getFullYear()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#5A67D8" />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["overview","monthly","students"] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "overview" ? "Overview" : t === "monthly" ? "Month-wise" : "Student-wise"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <>
            {/* Big income banner */}
            <View style={styles.incomeBanner}>
              <Text style={styles.bannerLabel}>Total Income Collected</Text>
              <Text style={styles.bannerAmount}>Rs.{stats.totalCollected.toLocaleString()}</Text>
              <View style={styles.bannerRow}>
                <View style={styles.bannerItem}>
                  <Text style={styles.bannerItemNum}>Rs.{stats.totalBalance.toLocaleString()}</Text>
                  <Text style={styles.bannerItemLabel}>Pending Balance</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerItem}>
                  <Text style={[styles.bannerItemNum, { color: "#FC8181" }]}>
                    Rs.{stats.totalDue.toLocaleString()}
                  </Text>
                  <Text style={styles.bannerItemLabel}>Total Dues</Text>
                </View>
              </View>
            </View>

            {/* Student stats grid */}
            <Text style={styles.sectionTitle}>Students</Text>
            <View style={styles.grid}>
              <StatCard icon="people"           color="#5A67D8" label="Total"    value={stats.total} />
              <StatCard icon="checkmark-circle" color="#38A169" label="Active"   value={stats.active} />
              <StatCard icon="pause-circle"     color="#E53E3E" label="Inactive" value={stats.inactive} />
              <StatCard icon="wifi"             color="#3182CE" label="Online"   value={stats.online} />
              <StatCard icon="business"         color="#805AD5" label="Offline"  value={stats.offline} />
            </View>

            {/* Current month quick glance */}
            {monthIncome.length > 0 && (() => {
              const cur = monthIncome[0];
              return (
                <>
                  <Text style={styles.sectionTitle}>This Month</Text>
                  <View style={styles.thisMonthCard}>
                    <Text style={styles.thisMonthLabel}>
                      {MONTH_SHORT[cur.month]} {cur.year}
                    </Text>
                    <View style={styles.thisMonthRow}>
                      <View style={styles.thisMonthStat}>
                        <Text style={[styles.thisMonthNum, { color: "#38A169" }]}>
                          Rs.{Number(cur.total_collected).toLocaleString()}
                        </Text>
                        <Text style={styles.thisMonthSubLabel}>Collected</Text>
                      </View>
                      <View style={styles.thisMonthStat}>
                        <Text style={[styles.thisMonthNum, { color: "#E53E3E" }]}>
                          Rs.{Number(cur.total_balance).toLocaleString()}
                        </Text>
                        <Text style={styles.thisMonthSubLabel}>Pending</Text>
                      </View>
                      <View style={styles.thisMonthStat}>
                        <Text style={[styles.thisMonthNum, { color: "#5A67D8" }]}>
                          {cur.payment_count}
                        </Text>
                        <Text style={styles.thisMonthSubLabel}>Payments</Text>
                      </View>
                    </View>
                  </View>
                </>
              );
            })()}
          </>
        )}

        {/* ── MONTHLY TAB ── */}
        {tab === "monthly" && (
          <>
            <Text style={styles.sectionTitle}>Month-wise Income</Text>
            {monthIncome.length === 0 ? (
              <EmptyState icon="bar-chart-outline" text="No income data yet" />
            ) : (
              monthIncome.map(m => {
                const collected = Number(m.total_collected);
                const balance   = Number(m.total_balance);
                const total     = collected + balance;
                const pct       = total > 0 ? (collected / total) * 100 : 100;
                return (
                  <View key={`${m.year}-${m.month}`} style={styles.monthCard}>
                    <View style={styles.monthCardTop}>
                      <Text style={styles.monthCardTitle}>
                        {MONTH_SHORT[m.month]} {m.year}
                      </Text>
                      <Text style={styles.monthPayCount}>{m.payment_count} payment(s)</Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.progressPct}>{Math.round(pct)}% collected</Text>

                    <View style={styles.monthAmounts}>
                      <View style={[styles.amtBox, { backgroundColor: "#C6F6D5" }]}>
                        <Text style={[styles.amtNum, { color: "#276749" }]}>
                          Rs.{collected.toLocaleString()}
                        </Text>
                        <Text style={styles.amtLabel}>Collected</Text>
                      </View>
                      {balance > 0 && (
                        <View style={[styles.amtBox, { backgroundColor: "#FED7D7" }]}>
                          <Text style={[styles.amtNum, { color: "#9B2C2C" }]}>
                            Rs.{balance.toLocaleString()}
                          </Text>
                          <Text style={styles.amtLabel}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── STUDENT-WISE TAB ── */}
        {tab === "students" && (
          <>
            <Text style={styles.sectionTitle}>Student-wise Income</Text>
            {studentIncome.length === 0 ? (
              <EmptyState icon="person-outline" text="No student income data yet" />
            ) : (
              studentIncome
                .sort((a, b) => b.total_paid - a.total_paid)
                .map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.studentCard}
                    onPress={() => router.push({ pathname: "/student-details", params: { id: s.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.studentCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{s.name}</Text>
                        <View style={styles.studentBadgeRow}>
                          <View style={[
                            styles.badge,
                            { backgroundColor: s.status === "active" ? "#C6F6D5" : "#FED7D7" }
                          ]}>
                            <Text style={[
                              styles.badgeText,
                              { color: s.status === "active" ? "#276749" : "#9B2C2C" }
                            ]}>
                              {s.status}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: "#EBF8FF" }]}>
                            <Text style={[styles.badgeText, { color: "#2B6CB0" }]}>
                              {s.class_type}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: "#E9D8FD" }]}>
                            <Text style={[styles.badgeText, { color: "#553C9A" }]}>
                              Fee: Rs.{s.monthly_fee}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                    </View>

                    <View style={styles.studentAmounts}>
                      <View style={styles.studentAmt}>
                        <Text style={[styles.studentAmtNum, { color: "#38A169" }]}>
                          Rs.{Number(s.total_paid).toLocaleString()}
                        </Text>
                        <Text style={styles.studentAmtLabel}>Total Paid</Text>
                      </View>
                      {Number(s.total_balance) > 0 && (
                        <View style={styles.studentAmt}>
                          <Text style={[styles.studentAmtNum, { color: "#E53E3E" }]}>
                            Rs.{Number(s.total_balance).toLocaleString()}
                          </Text>
                          <Text style={styles.studentAmtLabel}>Balance Due</Text>
                        </View>
                      )}
                      <View style={styles.studentAmt}>
                        <Text style={[styles.studentAmtNum, { color: "#5A67D8" }]}>
                          {s.payment_count}
                        </Text>
                        <Text style={styles.studentAmtLabel}>Payments</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, color, label, value }: any) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color="#CBD5E0" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: "#F4F6FA" },
  center:             { flex: 1, justifyContent: "center", alignItems: "center" },
  header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 16, paddingBottom: 0 },
  heading:            { fontSize: 24, fontWeight: "bold", color: "#2D3748" },
  sub:                { color: "#718096", marginTop: 2 },
  refreshBtn:         { padding: 8, backgroundColor: "#EBF4FF", borderRadius: 10 },

  tabBar:             { flexDirection: "row", margin: 14, marginBottom: 0, backgroundColor: "#E2E8F0", borderRadius: 12, padding: 4 },
  tabBtn:             { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabBtnActive:       { backgroundColor: "#5A67D8" },
  tabText:            { fontSize: 12, fontWeight: "600", color: "#4A5568" },
  tabTextActive:      { color: "white" },

  sectionTitle:       { fontSize: 16, fontWeight: "bold", color: "#2D3748", marginBottom: 10, marginTop: 6 },

  // Income banner
  incomeBanner:       { backgroundColor: "#5A67D8", borderRadius: 16, padding: 20, marginBottom: 16 },
  bannerLabel:        { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 4 },
  bannerAmount:       { color: "white", fontSize: 34, fontWeight: "bold", marginBottom: 16 },
  bannerRow:          { flexDirection: "row" },
  bannerItem:         { flex: 1, alignItems: "center" },
  bannerItemNum:      { color: "#BEE3F8", fontSize: 18, fontWeight: "bold" },
  bannerItemLabel:    { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  bannerDivider:      { width: 1, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 10 },

  // Stats grid
  grid:               { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard:           { width: "47%", backgroundColor: "white", padding: 14, borderRadius: 14, elevation: 2, borderLeftWidth: 4, alignItems: "center" },
  statValue:          { fontSize: 22, fontWeight: "bold", color: "#2D3748", marginTop: 6 },
  statLabel:          { fontSize: 11, color: "#718096", marginTop: 3 },

  // This month card
  thisMonthCard:      { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  thisMonthLabel:     { fontSize: 14, fontWeight: "bold", color: "#718096", marginBottom: 12 },
  thisMonthRow:       { flexDirection: "row", justifyContent: "space-around" },
  thisMonthStat:      { alignItems: "center" },
  thisMonthNum:       { fontSize: 20, fontWeight: "bold" },
  thisMonthSubLabel:  { fontSize: 11, color: "#718096", marginTop: 2 },

  // Monthly cards
  monthCard:          { backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2 },
  monthCardTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  monthCardTitle:     { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  monthPayCount:      { fontSize: 12, color: "#718096" },
  progressBg:         { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill:       { height: 8, backgroundColor: "#38A169", borderRadius: 4 },
  progressPct:        { fontSize: 11, color: "#718096", marginBottom: 10 },
  monthAmounts:       { flexDirection: "row", gap: 10 },
  amtBox:             { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  amtNum:             { fontSize: 16, fontWeight: "bold" },
  amtLabel:           { fontSize: 11, color: "#718096", marginTop: 2 },

  // Student cards
  studentCard:        { backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  studentCardTop:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  studentName:        { fontSize: 15, fontWeight: "bold", color: "#2D3748", marginBottom: 6 },
  studentBadgeRow:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge:              { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:          { fontSize: 11, fontWeight: "600" },
  studentAmounts:     { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F7FAFC", paddingTop: 10, gap: 10 },
  studentAmt:         { flex: 1, alignItems: "center" },
  studentAmtNum:      { fontSize: 15, fontWeight: "bold" },
  studentAmtLabel:    { fontSize: 10, color: "#718096", marginTop: 2 },

  empty:              { alignItems: "center", marginTop: 60 },
  emptyText:          { color: "#A0AEC0", marginTop: 10, fontSize: 15 },
});
