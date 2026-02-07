import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import * as SyncAPI from "../api/sync";
import { db, getUnsyncedRecords, markAsSynced } from "../database/database";

const LAST_SYNC_KEY = "last_sync_time";
const BATCH_SIZE = 50; // Number of records to sync at once

export interface SyncProgress {
  stage:
    | "checking"
    | "uploading"
    | "downloading"
    | "merging"
    | "complete"
    | "error";
  current: number;
  total: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  errors: string[];
  lastSyncTime: string;
}

/**
 * Check if device is online
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.error("[SyncManager] Error checking connection:", error);
    return false;
  }
};

/**
 * Get last sync time from storage
 */
export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error("[SyncManager] Error getting last sync time:", error);
    return null;
  }
};

/**
 * Update last sync time
 */
export const updateLastSyncTime = async (): Promise<void> => {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(LAST_SYNC_KEY, now);
};

/**
 * Get count of all unsynced records (transactions only in unified schema)
 */
export const getUnsyncedCount = (): number => {
  if (Platform.OS === "web") return 0;

  try {
    const result = db.getFirstSync(
      "SELECT COUNT(*) as count FROM transactions WHERE is_synced = 0",
    );
    return result?.count || 0;
  } catch (error) {
    console.error("[SyncManager] Error counting unsynced:", error);
    return 0;
  }
};

/**
 * Main sync function — uploads local unsynced transactions to server
 */
export const syncAllData = async (
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    uploadedCount: 0,
    downloadedCount: 0,
    errors: [],
    lastSyncTime: "",
  };

  try {
    onProgress?.({
      stage: "checking",
      current: 0,
      total: 1,
      message: "Checking connection...",
    });

    const isOnline = await checkConnection();
    if (!isOnline) throw new Error("No internet connection");

    const serverReachable = await SyncAPI.testConnection();
    if (!serverReachable) throw new Error("Cannot reach server");

    onProgress?.({
      stage: "uploading",
      current: 0,
      total: 1,
      message: "Uploading data...",
    });

    // Get unsynced transactions from unified DB
    const unsyncedTransactions = getUnsyncedRecords("transactions");

    if (unsyncedTransactions.length === 0) {
      result.success = true;
      result.lastSyncTime = new Date().toISOString();
      onProgress?.({
        stage: "complete",
        current: 1,
        total: 1,
        message: "Already up to date",
      });
      return result;
    }

    console.log(
      `[SyncManager] Syncing ${unsyncedTransactions.length} transactions`,
    );

    // Sync in batches
    const batches = Math.ceil(unsyncedTransactions.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
      const batch = unsyncedTransactions.slice(
        i * BATCH_SIZE,
        (i + 1) * BATCH_SIZE,
      );

      onProgress?.({
        stage: "uploading",
        current: i * BATCH_SIZE,
        total: unsyncedTransactions.length,
        message: `Syncing transactions (${i + 1}/${batches})...`,
      });

      try {
        const response = await SyncAPI.syncTransactions(batch);
        if (response.success) {
          const ids = batch.map((t: any) => t.id);
          markAsSynced("transactions", ids);
          result.uploadedCount += batch.length;
        }
      } catch (error: any) {
        console.error("[SyncManager] Batch error:", error);
        result.errors.push(`Batch ${i + 1}: ${error.message}`);
      }
    }

    await updateLastSyncTime();
    result.lastSyncTime = new Date().toISOString();
    result.success = result.errors.length === 0;

    onProgress?.({
      stage: "complete",
      current: unsyncedTransactions.length,
      total: unsyncedTransactions.length,
      message: `Synced ${result.uploadedCount} transactions`,
    });

    return result;
  } catch (error: any) {
    console.error("[SyncManager] Sync failed:", error);
    result.errors.push(error.message || "Sync failed");

    onProgress?.({
      stage: "error",
      current: 0,
      total: 1,
      message: error.message || "Sync failed",
    });

    return result;
  }
};

/**
 * Pull data from server and merge with local
 */
export const pullDataFromServer = async (
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    uploadedCount: 0,
    downloadedCount: 0,
    errors: [],
    lastSyncTime: "",
  };

  if (Platform.OS === "web") {
    result.errors.push("Pull not supported on web");
    return result;
  }

  try {
    onProgress?.({
      stage: "checking",
      current: 0,
      total: 1,
      message: "Checking connection...",
    });

    const isOnline = await checkConnection();
    if (!isOnline) throw new Error("No internet connection");

    onProgress?.({
      stage: "downloading",
      current: 0,
      total: 1,
      message: "Downloading data from server...",
    });

    const serverData = await SyncAPI.pullData();

    onProgress?.({
      stage: "merging",
      current: 0,
      total: 1,
      message: "Merging with local data...",
    });

    // Merge server transactions (INSERT OR IGNORE to keep local data)
    if (serverData.transactions && serverData.transactions.length > 0) {
      for (const tx of serverData.transactions as any[]) {
        try {
          const existing = db.getFirstSync(
            "SELECT id FROM transactions WHERE id = ?",
            [tx.id],
          );
          if (!existing) {
            db.runSync(
              `INSERT INTO transactions (
                id, type, gcash_account_id, from_account_id, to_account_id,
                amount, fee, discounted, status, reference, remarks,
                receiver_name, claimed_at, created_by_user_id, created_by_device_id,
                created_at, updated_at, synced_at, is_synced, conflict_resolved
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
              [
                tx.id,
                tx.type,
                tx.gcash_account_id,
                tx.from_account_id,
                tx.to_account_id,
                tx.amount,
                tx.fee,
                tx.discounted,
                tx.status,
                tx.reference,
                tx.remarks,
                tx.receiver_name,
                tx.claimed_at,
                tx.created_by_user_id,
                tx.created_by_device_id,
                tx.created_at,
                tx.updated_at,
                new Date().toISOString(),
              ],
            );
            result.downloadedCount++;
          }
        } catch (e) {
          // Duplicate — skip silently
        }
      }
    }

    // Merge GCash accounts
    if (serverData.gcash_accounts && serverData.gcash_accounts.length > 0) {
      for (const acct of serverData.gcash_accounts) {
        try {
          db.runSync(
            `INSERT OR REPLACE INTO gcash_accounts
               (id, name, number, type, is_active, created_by_device_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              acct.id,
              acct.name,
              acct.number,
              acct.type,
              acct.is_active,
              acct.created_by_device_id,
              acct.created_at,
              new Date().toISOString(),
            ],
          );
          result.downloadedCount++;
        } catch (e) {
          // skip
        }
      }
    }

    await updateLastSyncTime();
    result.lastSyncTime = new Date().toISOString();
    result.success = true;

    onProgress?.({
      stage: "complete",
      current: 1,
      total: 1,
      message: `Downloaded ${result.downloadedCount} items`,
    });

    return result;
  } catch (error: any) {
    console.error("[SyncManager] Pull failed:", error);
    result.errors.push(error.message || "Pull failed");

    onProgress?.({
      stage: "error",
      current: 0,
      total: 1,
      message: error.message || "Pull failed",
    });

    return result;
  }
};

/**
 * Full sync — upload then pull
 */
export const fullSync = async (
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
  const combinedResult: SyncResult = {
    success: false,
    uploadedCount: 0,
    downloadedCount: 0,
    errors: [],
    lastSyncTime: "",
  };

  try {
    const uploadResult = await syncAllData(onProgress);
    combinedResult.uploadedCount = uploadResult.uploadedCount;
    combinedResult.errors.push(...uploadResult.errors);

    const downloadResult = await pullDataFromServer(onProgress);
    combinedResult.downloadedCount = downloadResult.downloadedCount;
    combinedResult.errors.push(...downloadResult.errors);

    combinedResult.success = combinedResult.errors.length === 0;
    combinedResult.lastSyncTime = new Date().toISOString();

    return combinedResult;
  } catch (error: any) {
    console.error("[SyncManager] Full sync failed:", error);
    combinedResult.errors.push(error.message || "Full sync failed");
    return combinedResult;
  }
};

/**
 * Setup auto-sync when app comes online
 */
export const setupAutoSync = (onSync: () => void): (() => void) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log("[SyncManager] Connection restored — triggering auto-sync");
      setTimeout(() => onSync(), 2000);
    }
  });

  return unsubscribe;
};
