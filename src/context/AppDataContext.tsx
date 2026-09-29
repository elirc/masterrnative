import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createSampleData } from "../constants/sampleData";
import {
  clearAllData as storageClearAllData,
  exportAllData as storageExportAllData,
  getAppInitialized,
  importAllData as storageImportAllData,
  markAppInitialized,
  saveExpenses,
  saveFeedPurchases,
  saveFeedUsages,
  saveMortalityRecords,
  savePigBatches,
  saveSales,
} from "../services/storageService";
import {
  BackupData,
  Expense,
  FeedPurchase,
  FeedUsage,
  MortalityRecord,
  PigBatch,
  Sale,
} from "../types/models";
import { backupDataSchema } from "../utils/validation";
import { replaceRecordById } from "../utils/collection";

interface AppDataContextValue extends BackupData {
  isLoading: boolean;
  addPigBatch: (batch: PigBatch) => Promise<void>;
  updatePigBatch: (batch: PigBatch) => Promise<void>;
  deletePigBatch: (id: string) => Promise<void>;
  addFeedPurchase: (purchase: FeedPurchase) => Promise<void>;
  updateFeedPurchase: (purchase: FeedPurchase) => Promise<void>;
  deleteFeedPurchase: (id: string) => Promise<void>;
  addFeedUsage: (usage: FeedUsage) => Promise<void>;
  updateFeedUsage: (usage: FeedUsage) => Promise<void>;
  deleteFeedUsage: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addMortalityRecord: (record: MortalityRecord) => Promise<void>;
  updateMortalityRecord: (record: MortalityRecord) => Promise<void>;
  deleteMortalityRecord: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  clearData: () => Promise<void>;
  loadSampleData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const emptyData: BackupData = {
  pigBatches: [],
  feedPurchases: [],
  feedUsages: [],
  expenses: [],
  sales: [],
  mortalityRecords: [],
};

function hasAnyData(data: BackupData): boolean {
  return (
    data.pigBatches.length > 0 ||
    data.feedPurchases.length > 0 ||
    data.feedUsages.length > 0 ||
    data.expenses.length > 0 ||
    data.sales.length > 0 ||
    data.mortalityRecords.length > 0
  );
}

function parseBackupJson(json: string): BackupData {
  return backupDataSchema.parse(JSON.parse(json));
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [pigBatches, setPigBatches] = useState<PigBatch[]>([]);
  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [feedUsages, setFeedUsages] = useState<FeedUsage[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const applyData = useCallback((data: BackupData) => {
    setPigBatches(data.pigBatches);
    setFeedPurchases(data.feedPurchases);
    setFeedUsages(data.feedUsages);
    setExpenses(data.expenses);
    setSales(data.sales);
    setMortalityRecords(data.mortalityRecords);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialized = await getAppInitialized();
      let data = await storageExportAllData();

      if (!initialized) {
        if (!hasAnyData(data)) {
          data = createSampleData();
          await storageImportAllData(data);
        }
        await markAppInitialized();
      }

      applyData(data);
    } finally {
      setIsLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    refreshData().catch(() => {
      applyData(emptyData);
      setIsLoading(false);
    });
  }, [applyData, refreshData]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      pigBatches,
      feedPurchases,
      feedUsages,
      expenses,
      sales,
      mortalityRecords,
      isLoading,
      addPigBatch: async (batch) => {
        const next = [batch, ...pigBatches];
        await savePigBatches(next);
        setPigBatches(next);
      },
      updatePigBatch: async (batch) => {
        const next = replaceRecordById(pigBatches, batch);
        await savePigBatches(next);
        setPigBatches(next);
      },
      deletePigBatch: async (id) => {
        const next = pigBatches.filter((item) => item.id !== id);
        await savePigBatches(next);
        setPigBatches(next);
      },
      addFeedPurchase: async (purchase) => {
        const next = [purchase, ...feedPurchases];
        await saveFeedPurchases(next);
        setFeedPurchases(next);
      },
      updateFeedPurchase: async (purchase) => {
        const next = replaceRecordById(feedPurchases, purchase);
        await saveFeedPurchases(next);
        setFeedPurchases(next);
      },
      deleteFeedPurchase: async (id) => {
        const next = feedPurchases.filter((item) => item.id !== id);
        await saveFeedPurchases(next);
        setFeedPurchases(next);
      },
      addFeedUsage: async (usage) => {
        const next = [usage, ...feedUsages];
        await saveFeedUsages(next);
        setFeedUsages(next);
      },
      updateFeedUsage: async (usage) => {
        const next = replaceRecordById(feedUsages, usage);
        await saveFeedUsages(next);
        setFeedUsages(next);
      },
      deleteFeedUsage: async (id) => {
        const next = feedUsages.filter((item) => item.id !== id);
        await saveFeedUsages(next);
        setFeedUsages(next);
      },
      addExpense: async (expense) => {
        const next = [expense, ...expenses];
        await saveExpenses(next);
        setExpenses(next);
      },
      updateExpense: async (expense) => {
        const next = replaceRecordById(expenses, expense);
        await saveExpenses(next);
        setExpenses(next);
      },
      deleteExpense: async (id) => {
        const next = expenses.filter((item) => item.id !== id);
        await saveExpenses(next);
        setExpenses(next);
      },
      addSale: async (sale) => {
        const next = [sale, ...sales];
        await saveSales(next);
        setSales(next);
      },
      updateSale: async (sale) => {
        const next = replaceRecordById(sales, sale);
        await saveSales(next);
        setSales(next);
      },
      deleteSale: async (id) => {
        const next = sales.filter((item) => item.id !== id);
        await saveSales(next);
        setSales(next);
      },
      addMortalityRecord: async (record) => {
        const next = [record, ...mortalityRecords];
        await saveMortalityRecords(next);
        setMortalityRecords(next);
      },
      updateMortalityRecord: async (record) => {
        const next = replaceRecordById(mortalityRecords, record);
        await saveMortalityRecords(next);
        setMortalityRecords(next);
      },
      deleteMortalityRecord: async (id) => {
        const next = mortalityRecords.filter((item) => item.id !== id);
        await saveMortalityRecords(next);
        setMortalityRecords(next);
      },
      refreshData,
      exportData: async () => JSON.stringify(await storageExportAllData(), null, 2),
      importData: async (json) => {
        const data = parseBackupJson(json);
        await storageImportAllData(data);
        await markAppInitialized();
        applyData(data);
      },
      clearData: async () => {
        await storageClearAllData();
        await markAppInitialized();
        applyData(emptyData);
      },
      loadSampleData: async () => {
        const sampleData = createSampleData();
        await storageImportAllData(sampleData);
        await markAppInitialized();
        applyData(sampleData);
      },
    }),
    [
      applyData,
      expenses,
      feedPurchases,
      feedUsages,
      isLoading,
      mortalityRecords,
      pigBatches,
      refreshData,
      sales,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
