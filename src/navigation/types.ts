import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";

export type BatchFormParams = { batchId?: string } | undefined;
export type FeedPurchaseFormParams = { feedPurchaseId?: string } | undefined;
export type FeedUsageFormParams = { feedUsageId?: string; batchId?: string } | undefined;
export type ExpenseFormParams = { expenseId?: string; batchId?: string } | undefined;
export type SaleFormParams = { saleId?: string; batchId?: string } | undefined;
export type MortalityFormParams = { mortalityRecordId?: string; batchId?: string } | undefined;

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type BatchesStackParamList = {
  BatchList: undefined;
  BatchDetail: { batchId: string };
  BatchForm: BatchFormParams;
  SaleForm: SaleFormParams;
  FeedUsageForm: FeedUsageFormParams;
  ExpenseForm: ExpenseFormParams;
  MortalityForm: MortalityFormParams;
};

export type TransactionsStackParamList = {
  TransactionsHome: undefined;
  FeedInventory: undefined;
  FeedPurchaseList: undefined;
  FeedPurchaseForm: FeedPurchaseFormParams;
  FeedUsageList: undefined;
  FeedUsageForm: FeedUsageFormParams;
  ExpenseList: undefined;
  ExpenseForm: ExpenseFormParams;
  SalesList: undefined;
  SaleForm: SaleFormParams;
  MortalityList: undefined;
  MortalityForm: MortalityFormParams;
};

export type ReportsStackParamList = {
  Reports: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  DataQuality: undefined;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList> | undefined;
  BatchesTab: NavigatorScreenParams<BatchesStackParamList> | undefined;
  TransactionsTab: NavigatorScreenParams<TransactionsStackParamList> | undefined;
  ReportsTab: NavigatorScreenParams<ReportsStackParamList> | undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type BatchListScreenProps = NativeStackScreenProps<BatchesStackParamList, "BatchList">;
export type BatchDetailScreenProps = NativeStackScreenProps<BatchesStackParamList, "BatchDetail">;
export type BatchFormScreenProps = NativeStackScreenProps<BatchesStackParamList, "BatchForm">;

export type TransactionsHomeScreenProps = NativeStackScreenProps<TransactionsStackParamList, "TransactionsHome">;
export type FeedInventoryScreenProps = NativeStackScreenProps<TransactionsStackParamList, "FeedInventory">;
export type FeedPurchaseListScreenProps = NativeStackScreenProps<TransactionsStackParamList, "FeedPurchaseList">;
export type FeedPurchaseFormScreenProps = NativeStackScreenProps<TransactionsStackParamList, "FeedPurchaseForm">;
export type FeedUsageListScreenProps = NativeStackScreenProps<TransactionsStackParamList, "FeedUsageList">;
export type ExpenseListScreenProps = NativeStackScreenProps<TransactionsStackParamList, "ExpenseList">;
export type SalesListScreenProps = NativeStackScreenProps<TransactionsStackParamList, "SalesList">;
export type MortalityListScreenProps = NativeStackScreenProps<TransactionsStackParamList, "MortalityList">;
export type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, "Settings">;
export type DataQualityScreenProps = NativeStackScreenProps<SettingsStackParamList, "DataQuality">;

type FormNavigation = Pick<NativeStackNavigationProp<BatchesStackParamList & TransactionsStackParamList>, "goBack">;

export type FeedUsageFormScreenProps = {
  navigation: FormNavigation;
  route: { params?: FeedUsageFormParams };
};

export type ExpenseFormScreenProps = {
  navigation: FormNavigation;
  route: { params?: ExpenseFormParams };
};

export type SaleFormScreenProps = {
  navigation: FormNavigation;
  route: { params?: SaleFormParams };
};

export type MortalityFormScreenProps = {
  navigation: FormNavigation;
  route: { params?: MortalityFormParams };
};
