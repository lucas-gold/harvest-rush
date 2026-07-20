import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { EntryScreen } from "../screens/EntryScreen";
import { ArenaScreen } from "../screens/ArenaScreen";

export type RootStackParamList = {
  Entry: undefined;
  Arena: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    // documentTitle disabled — by default React Navigation retitles the web
    // tab to the active screen's route name ("Entry", "Arena") as you
    // navigate; the tab should always just read "Harvest Rush".
    <NavigationContainer documentTitle={{ enabled: false }}>
      <Stack.Navigator
        initialRouteName="Entry"
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        <Stack.Screen name="Entry" component={EntryScreen} />
        <Stack.Screen name="Arena" component={ArenaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
