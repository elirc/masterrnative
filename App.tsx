import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppDataProvider } from "./src/context/AppDataContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
