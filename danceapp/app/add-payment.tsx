// app/add-payment.tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";
const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getNextMonthLabel(m: number, y: number) {
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${MONTHS[nm]} ${ny}`;
}

export default function AddPayment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = new Date();

  const [month, setMonth]           = useState(String(today.getMonth() + 1));
  const [year, setYear]             = useState(String(today.getFullYear()));
  const [amount, setAmount]         = useState("");
  const [mode, setMode]             = useState<"Cash"|"UPI"|"Card">("Cash");
  const [payDate, setPayDate]       = useState(today.toISOString().slice(0, 10));
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    axios.get(`${BASE_URL}/students/${id}`).then(r => {
      setMonthlyFee(r.data.monthly_fee);
      setAmount(String(r.data.monthly_fee));
    });
  }, [id]);

  const paid    = Number(amount) || 0;
  const fee     = monthlyFee;
  const diff    = paid - fee;
  const balance = diff < 0 ? Math.abs(diff) : 0;   // still owed this month
  const credit  = diff > 0 ? diff : 0;             // carry-forward to next month

  const m = Number(month);
  const y = Number(year);
  const nextLabel          = getNextMonthLabel(m, y);
  const nextMonthDueAfter  = Math.max(0, fee - credit);

  const save = async () => {
    if (!month || !year || !amount) {
      Alert.alert("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/payments`, {
        student_id:   Number(id),
        month:        m,
        year:         y,
        amount_paid:  paid,
        payment_mode: mode,
        payment_date: payDate,
      });

      const { balance: bal, credit: cred, next_month_due } = res.data;

      let msg = "";
      if (cred > 0) {
        msg = `Extra Rs.${cred} credited to ${nextLabel}.\nNext month you only need to pay Rs.${next_month_due}.`;
      } else if (bal > 0) {
        msg = `Balance pending for this month: Rs.${bal}`;
      } else {
        msg = "Full payment done!";
      }

      Alert.alert("Payment Saved", msg, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (err?.response?.data?.code === "ER_DUP_ENTRY") {
        Alert.alert("Duplicate", "Payment for this month already exists");
      } else {
        Alert.alert("Error", "Failed to save payment");
      }
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Add Payment</Text>

      {/* Month / Year row */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Month (1–12)</Text>
          <TextInput
            style={styles.input} keyboardType="numeric"
            value={month} onChangeText={setMonth} placeholder="1-12"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input} keyboardType="numeric"
            value={year} onChangeText={setYear}
          />
        </View>
      </View>
      <Text style={styles.monthPreview}>{MONTHS[m] || "?"} {year}</Text>

      {/* Fee hint */}
      <View style={styles.feeInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#5A67D8" />
        <Text style={styles.feeInfoText}>Monthly fee: Rs.{fee}</Text>
      </View>

      {/* Amount input */}
      <Text style={styles.label}>Amount Paid (Rs.)</Text>
      <TextInput
        style={styles.input} keyboardType="numeric"
        value={amount} onChangeText={setAmount}
        placeholder={`Full fee: Rs.${fee}`}
      />

      {/* Live status feedback */}
      {paid > 0 && (
        <>
          {diff === 0 && (
            <View style={[styles.pill, styles.pillGreen]}>
              <Ionicons name="checkmark-circle" size={18} color="#276749" />
              <Text style={[styles.pillText, { color: "#276749" }]}>
                Full payment — Rs.{fee}
              </Text>
            </View>
          )}

          {balance > 0 && (
            <View style={[styles.pill, styles.pillOrange]}>
              <Ionicons name="warning" size={18} color="#C05621" />
              <Text style={[styles.pillText, { color: "#C05621" }]}>
                Balance due this month: Rs.{balance}
              </Text>
            </View>
          )}

          {credit > 0 && (
            <View style={styles.creditBox}>
              <View style={styles.creditRow}>
                <Ionicons name="checkmark-circle" size={18} color="#276749" />
                <Text style={[styles.pillText, { color: "#276749" }]}>
                  This month fully paid ✓
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.creditRow}>
                <Ionicons name="arrow-forward-circle" size={18} color="#2B6CB0" />
                <Text style={[styles.pillText, { color: "#2B6CB0" }]}>
                  Extra Rs.{credit} will be credited to {nextLabel}
                </Text>
              </View>
              <View style={styles.creditRow}>
                <Ionicons name="wallet-outline" size={18} color="#2B6CB0" />
                <Text style={[styles.pillText, { color: "#2B6CB0" }]}>
                  {nextLabel} — you only pay: Rs.{nextMonthDueAfter}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Payment Mode */}
      <Text style={styles.label}>Payment Mode</Text>
      <View style={styles.modeRow}>
        {(["Cash","UPI","Card"] as const).map(md => (
          <TouchableOpacity
            key={md}
            style={[styles.modeBtn, mode === md && styles.modeActive]}
            onPress={() => setMode(md)}
          >
            <Text style={[styles.modeText, mode === md && styles.modeTextActive]}>{md}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Date */}
      <Text style={styles.label}>Payment Date</Text>
      <TextInput
        style={styles.input} value={payDate}
        onChangeText={setPayDate} placeholder="YYYY-MM-DD"
      />

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={save} disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? "Saving..." : "Save Payment"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#F7FAFC", padding: 20 },
  title:          { fontSize: 22, fontWeight: "bold", color: "#2B6CB0", marginBottom: 20 },
  row:            { flexDirection: "row", gap: 12 },
  label:          { fontWeight: "600", marginBottom: 6, color: "#2D3748", marginTop: 4 },
  input:          { backgroundColor: "white", padding: 13, borderRadius: 10, marginBottom: 14, fontSize: 15 },
  monthPreview:   { textAlign: "center", fontSize: 18, fontWeight: "bold", color: "#5A67D8", marginBottom: 10, marginTop: -8 },
  feeInfo:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  feeInfoText:    { color: "#5A67D8", fontWeight: "600" },
  pill:           { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
  pillText:       { fontWeight: "600", fontSize: 14, flexShrink: 1 },
  pillGreen:      { backgroundColor: "#C6F6D5" },
  pillOrange:     { backgroundColor: "#FEEBC8" },
  creditBox:      { backgroundColor: "#EBF8FF", borderRadius: 12, padding: 14, marginBottom: 14, gap: 8, borderWidth: 1, borderColor: "#BEE3F8" },
  creditRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  divider:        { height: 1, backgroundColor: "#BEE3F8", marginVertical: 2 },
  modeRow:        { flexDirection: "row", gap: 10, marginBottom: 14 },
  modeBtn:        { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#E2E8F0", alignItems: "center" },
  modeActive:     { backgroundColor: "#805AD5" },
  modeText:       { fontWeight: "600", color: "#4A5568" },
  modeTextActive: { color: "white" },
  btn:            { backgroundColor: "#805AD5", padding: 15, borderRadius: 12, marginTop: 4 },
  btnText:        { color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" },
});
