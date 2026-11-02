import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { PortfolioProvider } from "./src/portfolio";
export default function App() {
  return (
    <SafeAreaProvider>
      <PortfolioProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </PortfolioProvider>
    </SafeAreaProvider>
  );
}
