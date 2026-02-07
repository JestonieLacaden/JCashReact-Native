/**
 * QR SYNC SERVICE
 *
 * Handles manual sync between devices using QR codes
 * - Admin generates QR with latest data
 * - Staff scans QR to receive updates
 * - Bi-directional: Both can export unsynced data
 *
 * KEY: Only transactions are synced, balances are calculated
 */

import { compress, decompress } from "lz-string";
import { Platform } from "react-native";
import { db } from "../database/database";
import { DeviceService } from "./DeviceService";
import { GcashAccount, GcashAccountService } from "./GcashAccountService";
import { Transaction, TransactionService } from "./TransactionService";

export interface SyncData {
  version: string;
  exported_by: string;
  exported_at: string;
  transactions: Transaction[];
  gcash_accounts: GcashAccount[];
  starting_balances: any[];
  fee_settings: any[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    transactions_imported: number;
    transactions_updated: number;
    accounts_updated: number;
    conflicts_resolved: number;
  };
}

export interface SyncStats {
  method: "qr" | "wifi" | "manual";
  synced_with_device_id: string;
  stats: {
    transactions_imported: number;
    transactions_updated: number;
    accounts_updated: number;
    conflicts_resolved: number;
  };
}

export class QRSyncService {
  private static readonly SYNC_VERSION = "1.0";

  /**
   * Get starting balances for export
   */
  private static getStartingBalances(): any[] {
    if (Platform.OS === "web") return [];

    try {
      const balances = db.getAllSync(
        "SELECT * FROM starting_balances ORDER BY effective_date DESC",
      );
      return balances;
    } catch (error) {
      console.error("Error getting starting balances:", error);
      return [];
    }
  }

  /**
   * Get fee settings for export
   */
  private static getFeeSettings(): any[] {
    if (Platform.OS === "web") return [];

    try {
      const settings = db.getAllSync("SELECT * FROM fee_settings");
      return settings;
    } catch (error) {
      console.error("Error getting fee settings:", error);
      return [];
    }
  }

  /**
   * Get last sync time
   */
  private static getLastSyncTime(): Date {
    if (Platform.OS === "web") return new Date(0);

    try {
      const lastSync = db.getFirstSync(
        "SELECT synced_at FROM sync_log ORDER BY synced_at DESC LIMIT 1",
      );

      return lastSync?.synced_at ? new Date(lastSync.synced_at) : new Date(0);
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return new Date(0);
    }
  }

  /**
   * Log sync operation
   */
  private static async logSync(params: SyncStats): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      db.runSync(
        `INSERT INTO sync_log (
          sync_method, transactions_sent, transactions_received, 
          conflicts_resolved, synced_with_device_id, synced_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          params.method,
          params.stats.transactions_imported || 0,
          params.stats.transactions_updated || 0,
          params.stats.conflicts_resolved || 0,
          params.synced_with_device_id,
          new Date().toISOString(),
          "success",
        ],
      );

      // Update device last sync time
      await DeviceService.updateLastSync(params.synced_with_device_id);
    } catch (error) {
      console.error("Error logging sync:", error);
    }
  }

  /**
   * Update starting balances from sync data
   */
  private static updateStartingBalances(balances: any[]): void {
    if (Platform.OS === "web") return;

    try {
      // Clear existing starting balances
      db.runSync("DELETE FROM starting_balances");

      // Insert new balances
      for (const balance of balances) {
        db.runSync(
          `INSERT INTO starting_balances (
            id, cash_wallet_balance, gcash_account_id, gcash_balance, 
            effective_date, created_by_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            balance.id,
            balance.cash_wallet_balance,
            balance.gcash_account_id,
            balance.gcash_balance,
            balance.effective_date,
            balance.created_by_user_id,
            balance.created_at,
          ],
        );
      }

      console.log("✅ Starting balances updated from sync");
    } catch (error) {
      console.error("Error updating starting balances:", error);
    }
  }

  /**
   * Update fee settings from sync data
   */
  private static updateFeeSettings(settings: any[]): void {
    if (Platform.OS === "web") return;

    try {
      // Clear existing fee settings
      db.runSync("DELETE FROM fee_settings");

      // Insert new settings with tier-based columns
      for (const setting of settings) {
        db.runSync(
          `INSERT INTO fee_settings (
            id, below_500_fee, five_hundred_to_999_fee, per_1000_fee,
            discounted_per_1000_fee, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            setting.id,
            setting.below_500_fee ?? 5,
            setting.five_hundred_to_999_fee ?? 10,
            setting.per_1000_fee ?? 15,
            setting.discounted_per_1000_fee ?? 10,
            setting.created_at,
            setting.updated_at,
          ],
        );
      }

      console.log("✅ Fee settings updated from sync");
    } catch (error) {
      console.error("Error updating fee settings:", error);
    }
  }

  /**
   * Generate QR sync data (from Admin device)
   * Exports all unsynced data for other devices
   */
  public static async generateSyncQR(): Promise<string> {
    if (Platform.OS === "web") {
      throw new Error("QR generation not supported on web");
    }

    try {
      const deviceInfo = await DeviceService.getDeviceInfo();
      const unsyncedTransactions = TransactionService.getUnsyncedTransactions();
      const allAccounts = GcashAccountService.getAllAccounts();
      const startingBalances = this.getStartingBalances();
      const feeSettings = this.getFeeSettings();

      const syncData: SyncData = {
        version: this.SYNC_VERSION,
        exported_by: deviceInfo.device_id,
        exported_at: new Date().toISOString(),
        transactions: unsyncedTransactions,
        gcash_accounts: allAccounts,
        starting_balances: startingBalances,
        fee_settings: feeSettings,
      };

      // Compress data to fit in QR code
      const jsonString = JSON.stringify(syncData);
      const compressed = compress(jsonString);

      console.log(
        `✅ QR data generated: ${compressed.length} chars (${unsyncedTransactions.length} transactions)`,
      );

      return compressed;
    } catch (error) {
      console.error("Error generating QR data:", error);
      throw new Error(
        `Failed to generate QR: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Import data from scanned QR code (to Staff device)
   * Merges transactions and resolves conflicts
   */
  public static async importFromQR(qrData: string): Promise<SyncResult> {
    if (Platform.OS === "web") {
      return {
        success: false,
        message: "QR import not supported on web",
      };
    }

    try {
      // Decompress data
      const decompressed = decompress(qrData);
      if (!decompressed) {
        throw new Error("Failed to decompress QR data");
      }

      const data: SyncData = JSON.parse(decompressed);

      // Validate version
      if (data.version !== this.SYNC_VERSION) {
        return {
          success: false,
          message: `Incompatible sync version. Expected ${this.SYNC_VERSION}, got ${data.version}`,
        };
      }

      // Check if data is newer than last sync
      const lastSync = this.getLastSyncTime();
      const exportedAt = new Date(data.exported_at);

      if (exportedAt <= lastSync) {
        return {
          success: false,
          message:
            "This data is older than your current data. No update needed.",
        };
      }

      const stats = {
        transactions_imported: 0,
        transactions_updated: 0,
        accounts_updated: 0,
        conflicts_resolved: 0,
      };

      // === IMPORT TRANSACTIONS (Merge strategy) ===
      for (const tx of data.transactions) {
        const existing = TransactionService.getTransactionById(tx.id);

        if (!existing) {
          // New transaction, insert it
          db.runSync(
            `INSERT INTO transactions (
              id, type, gcash_account_id, from_account_id, to_account_id, 
              amount, fee, discounted, status, reference, remarks, receiver_name, 
              claimed_at, created_by_user_id, created_by_device_id, created_at, 
              updated_at, synced_at, is_synced, conflict_resolved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              tx.synced_at,
              tx.is_synced,
              tx.conflict_resolved,
            ],
          );
          stats.transactions_imported++;
        } else {
          // Transaction exists, check for conflicts
          if (
            existing.created_at !== tx.created_at ||
            existing.amount !== tx.amount
          ) {
            // Conflict detected! Admin version wins
            db.runSync(
              `UPDATE transactions 
               SET amount = ?, fee = ?, status = ?, updated_at = ?, conflict_resolved = 1 
               WHERE id = ?`,
              [tx.amount, tx.fee, tx.status, new Date().toISOString(), tx.id],
            );
            stats.conflicts_resolved++;
          }
          stats.transactions_updated++;
        }
      }

      // === IMPORT GCASH ACCOUNTS ===
      for (const account of data.gcash_accounts) {
        await GcashAccountService.upsertAccount(account);
        stats.accounts_updated++;
      }

      // === UPDATE STARTING BALANCES (Admin is source of truth) ===
      this.updateStartingBalances(data.starting_balances);

      // === UPDATE FEE SETTINGS ===
      this.updateFeeSettings(data.fee_settings);

      // === LOG SYNC ===
      await this.logSync({
        method: "qr",
        synced_with_device_id: data.exported_by,
        stats,
      });

      return {
        success: true,
        message: `Sync successful! ${stats.transactions_imported} new transactions imported.`,
        stats,
      };
    } catch (error) {
      console.error("Error importing QR data:", error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get sync statistics
   */
  public static getSyncStats(): {
    unsynced_count: number;
    last_sync_at: string | null;
    total_syncs: number;
  } {
    if (Platform.OS === "web") {
      return {
        unsynced_count: 0,
        last_sync_at: null,
        total_syncs: 0,
      };
    }

    try {
      const unsyncedCount = db.getFirstSync(
        "SELECT COUNT(*) as count FROM transactions WHERE is_synced = 0",
      );

      const lastSync = db.getFirstSync(
        "SELECT synced_at FROM sync_log ORDER BY synced_at DESC LIMIT 1",
      );

      const totalSyncs = db.getFirstSync(
        'SELECT COUNT(*) as count FROM sync_log WHERE status = "success"',
      );

      return {
        unsynced_count: unsyncedCount?.count || 0,
        last_sync_at: lastSync?.synced_at || null,
        total_syncs: totalSyncs?.count || 0,
      };
    } catch (error) {
      console.error("Error getting sync stats:", error);
      return {
        unsynced_count: 0,
        last_sync_at: null,
        total_syncs: 0,
      };
    }
  }

  /**
   * Get sync history
   */
  public static getSyncHistory(limit: number = 10): any[] {
    if (Platform.OS === "web") return [];

    try {
      const history = db.getAllSync(
        "SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT ?",
        [limit],
      );
      return history;
    } catch (error) {
      console.error("Error getting sync history:", error);
      return [];
    }
  }
}

export default QRSyncService;
