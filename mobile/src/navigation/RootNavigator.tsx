import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import BetsScreen from "../screens/BetsScreen";
import EventsScreen from "../screens/EventsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Bets" component={BetsScreen} />
        <Stack.Screen name="Events" component={EventsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
