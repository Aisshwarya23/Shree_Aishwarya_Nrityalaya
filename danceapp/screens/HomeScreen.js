import React from "react";
import { View, Button } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ padding: 20 }}>
      <Button
        title="Add Student"
        onPress={() => navigation.navigate("AddStudent")}
      />
    </View>
  );
}