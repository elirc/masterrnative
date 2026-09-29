import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BackupData,
  Expense,
  FeedPurchase,
  FeedUsage,
  MortalityRecord,
  PigBatch,
  Sale,
} from "../types/models";

export const STORAGE_KEYS = {
  PIG_BATCHES: "piggery_pig_batches",
  FEED_PURCHASES: "piggery_feed_purchases",
  FEED_USAGES: "piggery_feed_usages",
  EXPENSES: "piggery_expenses",
  SALES: "piggery_sales",
  MORTALITY_RECORDS: "piggery_mortality_records",
  APP_INITIALIZED: "piggery_app_initialized",
};

async function getList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveList<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export function getPigBatches(): Promise<PigBatch[]> {
  return getList<PigBatch>(STORAGE_KEYS.PIG_BATCHES);
}

export function savePigBatches(items: PigBatch[]): Promise<void> {
  return saveList(STORAGE_KEYS.PIG_BATCHES, items);
}

export function getFeedPurchases(): Promise<FeedPurchase[]> {
  return getList<FeedPurchase>(STORAGE_KEYS.FEED_PURCHASES);
}

export function saveFeedPurchases(items: FeedPurchase[]): Promise<void> {
  return saveList(STORAGE_KEYS.FEED_PURCHASES, items);
}

export function getFeedUsages(): Promise<FeedUsage[]> {
  return getList<FeedUsage>(STORAGE_KEYS.FEED_USAGES);
}

export function saveFeedUsages(items: FeedUsage[]): Promise<void> {
  return saveList(STORAGE_KEYS.FEED_USAGES, items);
}

export function getExpenses(): Promise<Expense[]> {
  return getList<Expense>(STORAGE_KEYS.EXPENSES);
}

export function saveExpenses(items: Expense[]): Promise<void> {
  return saveList(STORAGE_KEYS.EXPENSES, items);
}

export function getSales(): Promise<Sale[]> {
  return getList<Sale>(STORAGE_KEYS.SALES);
}

export function saveSales(items: Sale[]): Promise<void> {
  return saveList(STORAGE_KEYS.SALES, items);
}

export function getMortalityRecords(): Promise<MortalityRecord[]> {
  return getList<MortalityRecord>(STORAGE_KEYS.MORTALITY_RECORDS);
}

export function saveMortalityRecords(items: MortalityRecord[]): Promise<void> {
  return saveList(STORAGE_KEYS.MORTALITY_RECORDS, items);
}

export async function exportAllData(): Promise<BackupData> {
  const [pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords] = await Promise.all([
    getPigBatches(),
    getFeedPurchases(),
    getFeedUsages(),
    getExpenses(),
    getSales(),
    getMortalityRecords(),
  ]);

  return { pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords };
}

export async function importAllData(data: BackupData): Promise<void> {
  await Promise.all([
    savePigBatches(data.pigBatches),
    saveFeedPurchases(data.feedPurchases),
    saveFeedUsages(data.feedUsages),
    saveExpenses(data.expenses),
    saveSales(data.sales),
    saveMortalityRecords(data.mortalityRecords),
  ]);
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    STORAGE_KEYS.PIG_BATCHES,
    STORAGE_KEYS.FEED_PURCHASES,
    STORAGE_KEYS.FEED_USAGES,
    STORAGE_KEYS.EXPENSES,
    STORAGE_KEYS.SALES,
    STORAGE_KEYS.MORTALITY_RECORDS,
  ].map((key) => AsyncStorage.removeItem(key)));
}

export async function getAppInitialized(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.APP_INITIALIZED)) === "true";
}

export async function markAppInitialized(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.APP_INITIALIZED, "true");
}
