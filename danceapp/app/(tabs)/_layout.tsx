// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5A67D8",
        tabBarInactiveTintColor: "#A0AEC0",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#E2E8F0" },
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#2D3748",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Students",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="edit-student"
        options={{
          title: "Edit Student",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payment-history"
        options={{
          title: "Pay History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />

      {/* ── Hidden from tab bar ── */}
      <Tabs.Screen name="add-payment"     options={{ href: null }} />
      <Tabs.Screen name="add-student"     options={{ href: null }} />
      <Tabs.Screen name="student-details" options={{ href: null }} />
    </Tabs>
  );
}