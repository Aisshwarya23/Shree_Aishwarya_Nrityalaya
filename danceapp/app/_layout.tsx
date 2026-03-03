// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTintColor: "#2D3748",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          contentStyle: { backgroundColor: "#F4F6FA" },
        }}
      >
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="student-details" options={{ title: "Student Details" }} />
        <Stack.Screen name="add-student"     options={{ title: "Add Student" }} />
        <Stack.Screen name="edit-student"    options={{ title: "Edit Student" }} />
        <Stack.Screen name="add-payment"     options={{ title: "Add Payment" }} />
        <Stack.Screen name="payment-history" options={{ title: "Payment History" }} />
        <Stack.Screen name="attendance"      options={{ title: "Attendance" }} />
      </Stack>
    </>
  );
}