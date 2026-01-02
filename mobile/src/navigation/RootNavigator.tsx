import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";

import MainTabs from "../components/MainTabs";
import { RootStackParamList } from "./types";
import { Logo } from "../components/Logo";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          headerBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: "#0F1115",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.05)",
              }}
            />
          ),
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#F5C542",
          headerLeft: () => {
            if (!navigation.canGoBack()) {
              return (
                <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                  <Logo />
                </TouchableOpacity>
              );
            }
            return null;
          },
          headerTitle: navigation.canGoBack() ? route.name : "",
          headerRight: () => (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => alert("Login pressed")}
            >
              <Text style={styles.loginText}>Log in</Text>
            </TouchableOpacity>
          ),
        })}
      >
        <Stack.Screen
          name="Home"
          component={MainTabs}
          options={{ headerShown: true }}
        />

        {/* Future stack screens */}
        {/* <Stack.Screen name="EventDetails" component={EventDetailsScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#C62828",
    borderRadius: 5,
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
  },
});
