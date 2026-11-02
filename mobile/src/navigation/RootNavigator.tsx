import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "../components/MainTabs";
import { SessionButton } from "../portfolio";
import { RootStackParamList } from "./types";
const Stack = createNativeStackNavigator<RootStackParamList>();
export default function RootNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#18261e" },
          headerTintColor: "#f0f5f2",
          headerTitle: "BulkBets · Demo",
          headerRight: () => <SessionButton />,
        }}
      >
        <Stack.Screen name="Home" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
