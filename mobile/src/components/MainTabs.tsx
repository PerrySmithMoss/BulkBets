import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { WalletScreen, usePortfolio } from "../portfolio";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import InPlayScreen from "../screens/InPlayScreen";
import MyBetsScreen from "../screens/MyBetsScreen";
import { MainTabParamList } from "../navigation/types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { user } = usePortfolio();
  return (
    <Tab.Navigator
      key={user?.id ?? "guest"}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F1115",
          borderTopColor: "rgba(255,255,255,0.05)",
        },
        tabBarActiveTintColor: "#64d498",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Home":
              iconName = "home-outline";
              break;
            case "Search":
              iconName = "search-outline";
              break;
            case "Wallet":
              iconName = "wallet-outline";
              break;
            case "InPlay":
              iconName = "flash-outline";
              break;
            case "MyBets":
              iconName = "receipt-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="InPlay"
        component={InPlayScreen}
        options={{ title: "Results" }}
      />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen
        name="MyBets"
        component={MyBetsScreen}
        options={{ title: "My Bets" }}
      />
    </Tab.Navigator>
  );
}
