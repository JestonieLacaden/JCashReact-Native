/**
 * SYNC STORE (Zustand)
 *
 * Uses the unified database.ts schema.
 * Handles both HTTP API sync and QR sync status tracking.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import * as SyncAPI from "../api/sync";
import { db, getUnsyncedRecords, markAsSynced } from "../database/database";

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  unsyncedCount: number;
  error: string | null;

  // Actions
  syncAll: () => Promise<void>;
  getUnsyncedCounts: () => void;
  updateLastSyncTime: () => Promise<void>;
  loadLastSyncTime: () => Promise<void>;
  testServerConnection: () => Promise<boolean>;
  clearError: () => void;
}

const LAST_SYNC_KEY = "last_sync_time";

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncTime: null,
  unsyncedCount: 0,
  error: null,

  /**
   * Sync all unsynced transactions to the server via HTTP API
   */
  syncAll: async () => {
    if (Platform.OS === "web") return;

    set({ isSyncing: true, error: null });

    try {
      // Test connection first
      const isConnected = await SyncAPI.testConnection();
      if (!isConnected) {
        throw new Error("No connection to server");
      }

      // Get unsynced transactions
      const unsyncedTransactions = getUnsyncedRecords("transactions");

      if (unsyncedTransactions.length === 0) {
        console.log("[SyncStore] No data to sync");
        set({ isSyncing: false });
        return;
      }

      console.log(
        `[SyncStore] Syncing ${unsyncedTransactions.length} transactions`,
      );

      // Push to server
      const result = await SyncAPI.syncAllData({
        transactions: unsyncedTransactions,
        gcash_accounts: [],
      });

      if (result.success) {
        // Mark transactions as synced
        const ids = unsyncedTransactions.map((t: any) => t.id);
        markAsSynced("transactions", ids);

        await get().updateLastSyncTime();
        get().getUnsyncedCounts();
        console.log("[SyncStore] Sync completed successfully");
      }

      set({ isSyncing: false });
    } catch (error: any) {
      const errorMessage = error.message || "Sync failed";
      console.error("[SyncStore] Sync error:", errorMessage);
      set({ error: errorMessage, isSyncing: false });
      throw error;
    }
  },

  /**
   * Get total unsynced count from the transactions table
   */
  getUnsyncedCounts: () => {
    if (Platform.OS === "web") return;

    try {
      const result = db.getFirstSync(
        "SELECT COUNT(*) as count FROM transactions WHERE is_synced = 0",
      );
      set({ unsyncedCount: result?.count || 0 });
    } catch (error) {
      console.error("[SyncStore] Error getting unsynced counts:", error);
    }
  },

  /**
   * Persist last sync time
   */
  updateLastSyncTime: async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNC_KEY, now);
    set({ lastSyncTime: now });
  },

  /**
   * Load persisted last sync time
   */
  loadLastSyncTime: async () => {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      set({ lastSyncTime: lastSync });
    } catch (error) {
      console.error("[SyncStore] Error loading last sync time:", error);
    }
  },

  /**
   * Test connection to the Laravel API server
   */
  testServerConnection: async () => {
    try {
      return await SyncAPI.testConnection();
    } catch {
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
