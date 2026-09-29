import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors } from "../constants/colors";
import { DashboardScreen } from "../screens/DashboardScreen";
import { BatchDetailScreen } from "../screens/batches/BatchDetailScreen";
import { BatchFormScreen } from "../screens/batches/BatchFormScreen";
import { BatchListScreen } from "../screens/batches/BatchListScreen";
import { ReportsScreen } from "../screens/reports/ReportsScreen";
import { DataQualityScreen } from "../screens/settings/DataQualityScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { ExpenseFormScreen } from "../screens/transactions/ExpenseFormScreen";
import { ExpenseListScreen } from "../screens/transactions/ExpenseListScreen";
import { FeedInventoryScreen } from "../screens/transactions/FeedInventoryScreen";
import { FeedPurchaseFormScreen } from "../screens/transactions/FeedPurchaseFormScreen";
import { FeedPurchaseListScreen } from "../screens/transactions/FeedPurchaseListScreen";
import { FeedUsageFormScreen } from "../screens/transactions/FeedUsageFormScreen";
import { FeedUsageListScreen } from "../screens/transactions/FeedUsageListScreen";
import { MortalityFormScreen } from "../screens/transactions/MortalityFormScreen";
import { MortalityListScreen } from "../screens/transactions/MortalityListScreen";
import { SaleFormScreen } from "../screens/transactions/SaleFormScreen";
import { SalesListScreen } from "../screens/transactions/SalesListScreen";
import { TransactionsHomeScreen } from "../screens/transactions/TransactionsHomeScreen";
import {
  BatchesStackParamList,
  DashboardStackParamList,
  MainTabParamList,
  ReportsStackParamList,
  SettingsStackParamList,
  TransactionsStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const BatchesStack = createNativeStackNavigator<BatchesStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "800" as const },
  contentStyle: { backgroundColor: colors.background },
};

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={stackScreenOptions}>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

function BatchesStackScreen() {
  return (
    <BatchesStack.Navigator screenOptions={stackScreenOptions}>
      <BatchesStack.Screen name="BatchList" component={BatchListScreen} options={{ title: "Pig Batches" }} />
      <BatchesStack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ title: "Batch Detail" }} />
      <BatchesStack.Screen name="BatchForm" component={BatchFormScreen} options={{ title: "Batch" }} />
      <BatchesStack.Screen name="SaleForm" component={SaleFormScreen} options={{ title: "Sale" }} />
      <BatchesStack.Screen name="FeedUsageForm" component={FeedUsageFormScreen} options={{ title: "Feed Usage" }} />
      <BatchesStack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "Expense" }} />
      <BatchesStack.Screen name="MortalityForm" component={MortalityFormScreen} options={{ title: "Mortality / Loss" }} />
    </BatchesStack.Navigator>
  );
}

function TransactionsStackScreen() {
  return (
    <TransactionsStack.Navigator screenOptions={stackScreenOptions}>
      <TransactionsStack.Screen name="TransactionsHome" component={TransactionsHomeScreen} options={{ title: "Transactions" }} />
      <TransactionsStack.Screen name="FeedInventory" component={FeedInventoryScreen} options={{ title: "Feed Inventory" }} />
      <TransactionsStack.Screen name="FeedPurchaseList" component={FeedPurchaseListScreen} options={{ title: "Feed Purchases" }} />
      <TransactionsStack.Screen name="FeedPurchaseForm" component={FeedPurchaseFormScreen} options={{ title: "Feed Purchase" }} />
      <TransactionsStack.Screen name="FeedUsageList" component={FeedUsageListScreen} options={{ title: "Feed Usage" }} />
      <TransactionsStack.Screen name="FeedUsageForm" component={FeedUsageFormScreen} options={{ title: "Feed Usage" }} />
      <TransactionsStack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: "Expenses" }} />
      <TransactionsStack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "Expense" }} />
      <TransactionsStack.Screen name="SalesList" component={SalesListScreen} options={{ title: "Sales" }} />
      <TransactionsStack.Screen name="SaleForm" component={SaleFormScreen} options={{ title: "Sale" }} />
      <TransactionsStack.Screen name="MortalityList" component={MortalityListScreen} options={{ title: "Mortality / Loss" }} />
      <TransactionsStack.Screen name="MortalityForm" component={MortalityFormScreen} options={{ title: "Mortality / Loss" }} />
    </TransactionsStack.Navigator>
  );
}

function ReportsStackScreen() {
  return (
    <ReportsStack.Navigator screenOptions={stackScreenOptions}>
      <ReportsStack.Screen name="Reports" component={ReportsScreen} />
    </ReportsStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen name="DataQuality" component={DataQualityScreen} options={{ title: "Data Quality" }} />
    </SettingsStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedText,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontWeight: "700" },
        }}
      >
        <Tab.Screen name="DashboardTab" component={DashboardStackScreen} options={{ title: "Dashboard" }} />
        <Tab.Screen name="BatchesTab" component={BatchesStackScreen} options={{ title: "Batches" }} />
        <Tab.Screen name="TransactionsTab" component={TransactionsStackScreen} options={{ title: "Transactions" }} />
        <Tab.Screen name="ReportsTab" component={ReportsStackScreen} options={{ title: "Reports" }} />
        <Tab.Screen name="SettingsTab" component={SettingsStackScreen} options={{ title: "Settings" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
