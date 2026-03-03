// app/attendance.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.29.150:5000";
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["","January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const KEY_OFFLINE = "class_schedule_offline";
const KEY_ONLINE  = "class_schedule_online";

export default function AttendanceScreen(): React.JSX.Element {
  const params = useLocalSearchParams();
  const id = String(Array.isArray(params.id) ? params.id[0] : (params.id ?? ""));

  const today = new Date();
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth() + 1);
  const [viewYear,  setViewYear]  = useState<number>(today.getFullYear());
  const [classType,   setClassType]   = useState<string>("offline");
  const [offlineDays, setOfflineDays] = useState<number[]>([1, 3, 5]);
  const [onlineDays,  setOnlineDays]  = useState<number[]>([2, 4]);
  const [editingMode, setEditingMode] = useState<boolean>(false);
  const [attendance,  setAttendance]  = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [savingKey,   setSavingKey]   = useState<string | null>(null);

  // Load student class type + saved schedules once
  useEffect(() => {
    if (!id) return;
    const init = async (): Promise<void> => {
      try {
        const [sRes, offRaw, onRaw] = await Promise.all([
          axios.get(BASE_URL + "/students/" + id),
          AsyncStorage.getItem(KEY_OFFLINE),
          AsyncStorage.getItem(KEY_ONLINE),
        ]);
        setClassType(sRes.data.class_type || "offline");
        if (offRaw) setOfflineDays(JSON.parse(offRaw) as number[]);
        if (onRaw)  setOnlineDays(JSON.parse(onRaw) as number[]);
      } catch (e) {
        console.log("Attendance init error:", e);
      }
    };
    void init();
  }, [id]);

  // Reload when month/year changes
  useEffect(() => {
    if (id) void loadAttendance();
  }, [viewMonth, viewYear, id]);

  const loadAttendance = async (): Promise<void> => {
    setLoadingData(true);
    try {
      const res = await axios.get(
        BASE_URL + "/students/" + id +
        "/attendance?month=" + viewMonth + "&year=" + viewYear
      );
      const map: Record<string, string> = {};
      (res.data as Array<{ date: string; status: string }>).forEach((a) => {
        const key = a.date ? String(a.date).slice(0, 10) : "";
        if (key) map[key] = a.status;
      });
      setAttendance(map);
    } catch (e) {
      console.log("Load attendance error:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const activeSchedule: number[] = classType === "online" ? onlineDays : offlineDays;

  const toggleScheduleDay = async (dow: number): Promise<void> => {
    if (classType === "offline") {
      const updated = offlineDays.includes(dow)
        ? offlineDays.filter((d) => d !== dow)
        : [...offlineDays, dow];
      setOfflineDays(updated);
      await AsyncStorage.setItem(KEY_OFFLINE, JSON.stringify(updated));
    } else {
      const updated = onlineDays.includes(dow)
        ? onlineDays.filter((d) => d !== dow)
        : [...onlineDays, dow];
      setOnlineDays(updated);
      await AsyncStorage.setItem(KEY_ONLINE, JSON.stringify(updated));
    }
  };

  const toggleAttendance = async (day: number): Promise<void> => {
    const dow = new Date(viewYear, viewMonth - 1, day).getDay();
    if (!activeSchedule.includes(dow)) {
      Alert.alert(
        "Not a class day",
        "This date is not in the " + classType + " schedule. Tap Edit to update class days."
      );
      return;
    }
    const mm = String(viewMonth).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = viewYear + "-" + mm + "-" + dd;
    const current = attendance[dateStr];
    const next: string = current === "present" ? "absent" : "present";

    // Optimistic update
    setAttendance((prev) => ({ ...prev, [dateStr]: next }));
    setSavingKey(dateStr);

    try {
      await axios.post(BASE_URL + "/attendance", {
        student_id: Number(id),
        date: dateStr,
        status: next,
        month: viewMonth,
        year: viewYear,
      });
    } catch (e) {
      console.log("Save attendance error:", e);
      // Revert on failure
      setAttendance((prev) => {
        const reverted = { ...prev };
        if (current) {
          reverted[dateStr] = current;
        } else {
          delete reverted[dateStr];
        }
        return reverted;
      });
      Alert.alert("Error", "Failed to save attendance. Check server.");
    } finally {
      setSavingKey(null);
    }
  };

  const changeMonth = (dir: number): void => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  };

  const totalDays  = new Date(viewYear, viewMonth, 0).getDate();
  const firstDOW   = new Date(viewYear, viewMonth - 1, 1).getDay();
  const presentCnt = Object.values(attendance).filter((v) => v === "present").length;
  const absentCnt  = Object.values(attendance).filter((v) => v === "absent").length;

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const isOnline  = classType === "online";
  const typeColor = isOnline ? "#3182CE" : "#805AD5";
  const typeBg    = isOnline ? "#EBF8FF" : "#FAF5FF";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Class type indicator */}
      <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeColor }]}>
        <Ionicons name={isOnline ? "wifi" : "business"} size={15} color={typeColor} />
        <Text style={[styles.typeBadgeText, { color: typeColor }]}>
          {"  " + (isOnline ? "Online" : "Offline") + " Student  —  Using " + (isOnline ? "Online" : "Offline") + " Schedule"}
        </Text>
      </View>

      {/* Month navigator */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#5A67D8" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color="#5A67D8" />
        </TouchableOpacity>
      </View>

      {/* Summary chips */}
      <View style={styles.summaryRow}>
        <View style={[styles.chip, { backgroundColor: "#C6F6D5", marginRight: 8 }]}>
          <Text style={styles.chipNum}>{presentCnt}</Text>
          <Text style={styles.chipLabel}>Present</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: "#FED7D7", marginRight: 8 }]}>
          <Text style={styles.chipNum}>{absentCnt}</Text>
          <Text style={styles.chipLabel}>Absent</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: "#EBF8FF" }]}>
          <Text style={styles.chipNum}>{presentCnt + absentCnt}</Text>
          <Text style={styles.chipLabel}>Marked</Text>
        </View>
      </View>

      {/* Schedule editor */}
      <View style={[styles.schedCard, { borderLeftColor: typeColor }]}>
        <View style={styles.schedHeader}>
          <Text style={styles.schedTitle}>
            {isOnline ? "Online" : "Offline"} Class Days
          </Text>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: typeColor }]}
            onPress={() => setEditingMode(!editingMode)}
          >
            <Text style={styles.editBtnText}>{editingMode ? "Done" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dayRow}>
          {DAY_LABELS.map((label: string, i: number) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayBtn,
                activeSchedule.includes(i) && { backgroundColor: typeColor },
              ]}
              onPress={() => {
                if (!editingMode) {
                  Alert.alert("Tip", "Tap Edit to change which days classes are held.");
                  return;
                }
                void toggleScheduleDay(i);
              }}
            >
              <Text style={[
                styles.dayBtnTxt,
                activeSchedule.includes(i) && { color: "white" },
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>
          {editingMode
            ? "Tap days to toggle. Changes apply to ALL " + (isOnline ? "online" : "offline") + " students."
            : "Highlighted days = class days. Only these can be marked."}
        </Text>
      </View>

      {/* Calendar */}
      {loadingData ? (
        <ActivityIndicator size="large" color="#5A67D8" style={{ marginVertical: 30 }} />
      ) : (
        <View style={styles.calendar}>
          {/* Day headers */}
          {DAY_LABELS.map((d: string) => (
            <View key={d} style={styles.calCell}>
              <Text style={styles.dayHeader}>{d}</Text>
            </View>
          ))}
          {/* Date cells */}
          {cells.map((day: number | null, idx: number) => {
            if (day === null) {
              return <View key={"empty-" + idx} style={styles.calCell} />;
            }
            const mm = String(viewMonth).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            const dateStr = viewYear + "-" + mm + "-" + dd;
            const status  = attendance[dateStr];
            const dow     = new Date(viewYear, viewMonth - 1, day).getDay();
            const isClass = activeSchedule.includes(dow);
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() + 1 &&
              viewYear  === today.getFullYear();
            const busy = savingKey === dateStr;

            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.calCell}
                onPress={() => void toggleAttendance(day)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <View style={[
                  styles.circle,
                  isToday && styles.todayBorder,
                  !isClass && styles.noClass,
                  status === "present" && styles.present,
                  status === "absent"  && styles.absent,
                ]}>
                  {busy ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={[
                      styles.dateText,
                      !isClass && { color: "#CBD5E0" },
                      (status === "present" || status === "absent") && { color: "white" },
                    ]}>
                      {day}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {([
          ["#38A169", "Present"],
          ["#E53E3E", "Absent"],
          ["#E2E8F0", "No class"],
        ] as Array<[string, string]>).map(([color, label]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendTxt}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.tapHint}>
        Tap a highlighted date to toggle Present / Absent
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#F7FAFC", padding: 14 },
  typeBadge:     { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  typeBadgeText: { fontWeight: "700", fontSize: 13 },
  navRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  navBtn:        { padding: 10, borderRadius: 10, backgroundColor: "#EBF4FF" },
  monthTitle:    { fontSize: 20, fontWeight: "bold", color: "#2D3748" },
  summaryRow:    { flexDirection: "row", marginBottom: 14 },
  chip:          { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
  chipNum:       { fontSize: 22, fontWeight: "bold", color: "#2D3748" },
  chipLabel:     { fontSize: 12, color: "#718096", marginTop: 2 },
  schedCard:     { backgroundColor: "white", padding: 14, borderRadius: 14, marginBottom: 14, elevation: 2, borderLeftWidth: 4 },
  schedHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  schedTitle:    { fontWeight: "bold", fontSize: 15, color: "#2D3748" },
  editBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  editBtnText:   { color: "white", fontWeight: "700", fontSize: 13 },
  dayRow:        { flexDirection: "row" },
  dayBtn:        { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#E2E8F0", alignItems: "center", marginRight: 3 },
  dayBtnTxt:     { fontSize: 11, fontWeight: "700", color: "#4A5568" },
  hint:          { fontSize: 11, color: "#A0AEC0", marginTop: 8 },
  calendar:      { flexDirection: "row", flexWrap: "wrap", backgroundColor: "white", borderRadius: 14, padding: 8, elevation: 2, marginBottom: 14 },
  calCell:       { width: "14.28%", alignItems: "center", paddingVertical: 5 },
  dayHeader:     { fontSize: 11, fontWeight: "700", color: "#A0AEC0" },
  circle:        { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  todayBorder:   { borderWidth: 2, borderColor: "#5A67D8" },
  noClass:       { backgroundColor: "#F7FAFC" },
  present:       { backgroundColor: "#38A169" },
  absent:        { backgroundColor: "#E53E3E" },
  dateText:      { fontSize: 13, fontWeight: "600", color: "#2D3748" },
  legend:        { flexDirection: "row", justifyContent: "center", marginBottom: 6 },
  legendItem:    { flexDirection: "row", alignItems: "center", marginRight: 14 },
  legendDot:     { width: 11, height: 11, borderRadius: 6, marginRight: 5 },
  legendTxt:     { fontSize: 11, color: "#718096" },
  tapHint:       { textAlign: "center", fontSize: 12, color: "#A0AEC0", marginBottom: 10 },
});
