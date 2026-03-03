// app/payment-history.tsx
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";
const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Payment = {
  id: number;
  month: number;
  year: number;
  amount_paid: number;
  balance: number;
  credit_remaining?: number;
  payment_mode: string;
  payment_date: string;
};

type MonthGroup = {
  label: string;
  year: number;
  month: number;
  payments: Payment[];
  totalPaid: number;
  totalBalance: number;
};

export default function PaymentHistory() {
  const { id }                          = useLocalSearchParams<{ id: string }>();
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [view, setView]                 = useState<"list" | "monthly">("list");

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const load = async (isRefresh = false) => {
    if (!id) { setError("No student ID."); setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/students/${id}/payments`, { timeout: 8000 });
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      if (e?.code === "ECONNABORTED") {
        setError("Request timed out. Is the server on at " + BASE_URL + "?");
      } else if (e?.message?.includes("Network Error")) {
        setError("Network error — make sure phone & server are on the same Wi-Fi.\n" + BASE_URL);
      } else {
        setError(e?.response?.data?.message || e?.message || "Unknown error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmDelete = (p: Payment) => {
    Alert.alert(
      "Delete Payment",
      `Delete payment for ${MONTH_SHORT[p.month]} ${p.year}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePayment(p.id) },
      ]
    );
  };

  const deletePayment = async (pid: number) => {
    try {
      await axios.delete(`${BASE_URL}/payments/${pid}`, { timeout: 8000 });
      load();
    } catch {
      Alert.alert("Error", "Failed to delete payment.");
    }
  };

  // ── Totals ──
  const grandTotal   = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const grandBalance = payments.reduce((s, p) => s + Number(p.balance || 0), 0);
  const grandCredit  = payments.reduce((s, p) => s + Number(p.credit_remaining || 0), 0);

  // ── Monthly grouping ──
  const monthGroups: MonthGroup[] = [];
  const seen: Record<string, MonthGroup> = {};
  [...payments]
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    .forEach(p => {
      const key = `${p.year}-${p.month}`;
      if (!seen[key]) {
        seen[key] = {
          label: `${MONTH_NAMES[p.month]} ${p.year}`,
          year: p.year, month: p.month,
          payments: [], totalPaid: 0, totalBalance: 0,
        };
        monthGroups.push(seen[key]);
      }
      seen[key].payments.push(p);
      seen[key].totalPaid    += Number(p.amount_paid);
      seen[key].totalBalance += Number(p.balance || 0);
    });

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#805AD5" />
        <Text style={styles.loadingText}>Loading payments…</Text>
        <Text style={styles.loadingHint}>{BASE_URL}</Text>
      </View>
    );
  }

  // ── Error screen ──
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={56} color="#FC8181" />
        <Text style={styles.errorTitle}>Could not load payments</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.retryText}> Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{payments.length}</Text>
          <Text style={styles.summaryLabel}>Payments</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#38A169" }]}>Rs.{grandTotal}</Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#E53E3E" }]}>Rs.{grandBalance}</Text>
          <Text style={styles.summaryLabel}>Balance</Text>
        </View>
        {grandCredit > 0 && (
          <>
            <View style={styles.vDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#2B6CB0" }]}>Rs.{grandCredit}</Text>
              <Text style={styles.summaryLabel}>Credit</Text>
            </View>
          </>
        )}
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewBtn, view === "list" && styles.viewBtnActive]}
          onPress={() => setView("list")}
        >
          <Ionicons name="list" size={16} color={view === "list" ? "white" : "#4A5568"} />
          <Text style={[styles.viewBtnText, view === "list" && { color: "white" }]}>  All Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, view === "monthly" && styles.viewBtnActive]}
          onPress={() => setView("monthly")}
        >
          <Ionicons name="bar-chart" size={16} color={view === "monthly" ? "white" : "#4A5568"} />
          <Text style={[styles.viewBtnText, view === "monthly" && { color: "white" }]}>  Month-wise</Text>
        </TouchableOpacity>
      </View>

      {/* LIST VIEW */}
      {view === "list" && (
        <FlatList
          data={payments}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>No payment records yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardMonth}>{MONTH_SHORT[item.month]} {item.year}</Text>
                  <Text style={styles.cardDate}>
                    Paid on: {item.payment_date ? String(item.payment_date).slice(0, 10) : "N/A"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                </TouchableOpacity>
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.badge, { backgroundColor: "#C6F6D5" }]}>
                  <Text style={[styles.badgeText, { color: "#276749" }]}>Paid: Rs.{item.amount_paid}</Text>
                </View>
                {Number(item.balance) > 0 && (
                  <View style={[styles.badge, { backgroundColor: "#FED7D7" }]}>
                    <Text style={[styles.badgeText, { color: "#9B2C2C" }]}>Due: Rs.{item.balance}</Text>
                  </View>
                )}
                {Number(item.credit_remaining) > 0 && (
                  <View style={[styles.badge, { backgroundColor: "#EBF8FF" }]}>
                    <Text style={[styles.badgeText, { color: "#2B6CB0" }]}>Credit: Rs.{item.credit_remaining}</Text>
                  </View>
                )}
                <View style={[styles.badge, { backgroundColor: "#E9D8FD" }]}>
                  <Text style={[styles.badgeText, { color: "#553C9A" }]}>{item.payment_mode || "Cash"}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* MONTHLY VIEW */}
      {view === "monthly" && (
        <FlatList
          data={monthGroups}
          keyExtractor={g => `${g.year}-${g.month}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>No monthly data yet</Text>
            </View>
          }
          renderItem={({ item: g }) => (
            <View style={styles.monthCard}>
              <View style={styles.monthCardHeader}>
                <Text style={styles.monthCardTitle}>{g.label}</Text>
                <Text style={styles.monthCount}>{g.payments.length} payment(s)</Text>
              </View>

              {/* Progress bar */}
              {(() => {
                const total = g.totalPaid + g.totalBalance;
                const pct   = total > 0 ? (g.totalPaid / total) * 100 : 100;
                return (
                  <>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.progressPct}>{Math.round(pct)}% collected</Text>
                  </>
                );
              })()}

              <View style={styles.monthStats}>
                <View style={[styles.statBox, { backgroundColor: "#C6F6D5" }]}>
                  <Text style={styles.statNum}>Rs.{g.totalPaid}</Text>
                  <Text style={styles.statLabel}>Collected</Text>
                </View>
                {g.totalBalance > 0 && (
                  <View style={[styles.statBox, { backgroundColor: "#FED7D7" }]}>
                    <Text style={[styles.statNum, { color: "#9B2C2C" }]}>Rs.{g.totalBalance}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                )}
              </View>

              {g.payments.map(p => (
                <View key={p.id} style={styles.miniRow}>
                  <Text style={styles.miniDate}>{p.payment_date ? String(p.payment_date).slice(0, 10) : "N/A"}</Text>
                  <Text style={styles.miniPaid}>Rs.{p.amount_paid}</Text>
                  <Text style={styles.miniMode}>{p.payment_mode || "Cash"}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#F7FAFC", padding: 14 },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText:    { marginTop: 10, color: "#718096" },
  loadingHint:    { marginTop: 6, color: "#A0AEC0", fontSize: 12 },
  errorTitle:     { fontSize: 16, fontWeight: "bold", color: "#E53E3E", marginTop: 16, textAlign: "center" },
  errorMsg:       { color: "#718096", marginTop: 8, textAlign: "center", lineHeight: 20 },
  retryBtn:       { flexDirection: "row", alignItems: "center", backgroundColor: "#805AD5", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  retryText:      { color: "white", fontWeight: "600" },

  summaryCard:    { backgroundColor: "white", flexDirection: "row", padding: 16, borderRadius: 14, marginBottom: 12, elevation: 3, justifyContent: "space-around", alignItems: "center" },
  summaryItem:    { alignItems: "center", flex: 1 },
  summaryNum:     { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  summaryLabel:   { fontSize: 10, color: "#718096", marginTop: 2 },
  vDivider:       { width: 1, height: 40, backgroundColor: "#E2E8F0" },

  viewToggle:     { flexDirection: "row", marginBottom: 12, backgroundColor: "#E2E8F0", borderRadius: 12, padding: 4 },
  viewBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 10 },
  viewBtnActive:  { backgroundColor: "#805AD5" },
  viewBtnText:    { fontWeight: "600", color: "#4A5568", fontSize: 13 },

  card:           { backgroundColor: "white", padding: 14, borderRadius: 14, marginBottom: 10, elevation: 2 },
  cardHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardMonth:      { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  cardDate:       { fontSize: 12, color: "#718096", marginTop: 2 },
  deleteBtn:      { padding: 6 },
  cardFooter:     { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText:      { fontSize: 12, fontWeight: "700" },

  empty:          { alignItems: "center", marginTop: 60 },
  emptyText:      { color: "#A0AEC0", marginTop: 10, fontSize: 15 },

  monthCard:      { backgroundColor: "white", padding: 14, borderRadius: 14, marginBottom: 12, elevation: 2 },
  monthCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  monthCardTitle: { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  monthCount:     { fontSize: 12, color: "#718096" },
  progressBg:     { height: 6, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill:   { height: 6, backgroundColor: "#38A169", borderRadius: 4 },
  progressPct:    { fontSize: 11, color: "#718096", marginBottom: 10 },
  monthStats:     { flexDirection: "row", gap: 10, marginBottom: 8 },
  statBox:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  statNum:        { fontSize: 15, fontWeight: "bold", color: "#276749" },
  statLabel:      { fontSize: 11, color: "#718096" },
  miniRow:        { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#F7FAFC" },
  miniDate:       { fontSize: 12, color: "#718096", flex: 1 },
  miniPaid:       { fontSize: 12, fontWeight: "600", color: "#38A169", flex: 1, textAlign: "center" },
  miniMode:       { fontSize: 12, color: "#805AD5", flex: 1, textAlign: "right" },
});
