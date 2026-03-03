import React, { useState } from "react";
import { View, TextInput, Button, Alert } from "react-native";
import axios from "axios";

export default function AddStudentScreen() {
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");

  const addStudent = async () => {
    try {
      await axios.post("http://192.168.29.150:5000/students", {
        name: name,
        phone: "9999999999",
        joining_date: "2026-03-01",
        monthly_fee: parseInt(fee)
      });

      Alert.alert("Success", "Student Added");
    } catch (error) {
      Alert.alert("Error", "Failed to add student");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Student Name"
        onChangeText={setName}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Monthly Fee"
        keyboardType="numeric"
        onChangeText={setFee}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <Button title="Add Student" onPress={addStudent} />
    </View>
  );
}