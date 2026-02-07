/**
 * TRANSACTION STORE (Zustand)
 *
 * Uses the unified database.ts schema with UUID primary keys.
 * Wraps TransactionService for state management in React components.
 */

import { Platform } from "react-native";
import { create } from "zustand";
import { db } from "../database/database";
import { TransactionService } from "../services/TransactionService";
import type {
  CashInData,
  CashOutData,
  Transaction,
  TransactionType,
} from "../types";

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  unsyncedCount: number;

  // Actions
  loadTransactions: (filter?: TransactionType | null) => void;
  createCashIn: (data: CashInData) => Promise<Transaction>;
  createCashOut: (data: CashOutData) => Promise<Transaction>;
  getUnsyncedCount: () => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  unsyncedCount: 0,

  /**
   * Load transactions from the unified database
   */
  loadTransactions: (filter?: TransactionType | null) => {
    if (Platform.OS === "web") {
      set({ transactions: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      let transactions: Transaction[];

      if (filter) {
        transactions = db.getAllSync(
          "SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC",
          [filter],
        ) as Transaction[];
      } else {
        transactions = TransactionService.getAllTransactions();
      }

      set({ transactions, isLoading: false });
    } catch (error: any) {
      console.error("[TransactionStore] Error loading transactions:", error);
      set({
        error: error.message || "Failed to load transactions",
        isLoading: false,
      });
    }
  },

  /**
   * Create a cash-in transaction via TransactionService
   */
  createCashIn: async (data: CashInData) => {
    set({ isLoading: true, error: null });

    try {
      const tx = await TransactionService.createCashIn(data);
      // Reload list & unsynced count
      get().loadTransactions();
      get().getUnsyncedCount();
      set({ isLoading: false });
      return tx;
    } catch (error: any) {
      set({
        error: error.message || "Failed to create cash-in",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Create a cash-out transaction via TransactionService
   */
  createCashOut: async (data: CashOutData) => {
    set({ isLoading: true, error: null });

    try {
      const tx = await TransactionService.createCashOut(data);
      get().loadTransactions();
      get().getUnsyncedCount();
      set({ isLoading: false });
      return tx;
    } catch (error: any) {
      set({
        error: error.message || "Failed to create cash-out",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Get unsynced transaction count
   */
  getUnsyncedCount: () => {
    if (Platform.OS === "web") {
      set({ unsyncedCount: 0 });
      return;
    }

    try {
      const result = db.getFirstSync(
        "SELECT COUNT(*) as count FROM transactions WHERE is_synced = 0",
      );
      set({ unsyncedCount: result?.count || 0 });
    } catch (error) {
      console.error("[TransactionStore] Error getting unsynced count:", error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
