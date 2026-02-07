/**
 * GCASH ACCOUNT SERVICE
 *
 * Manages GCash accounts for the system
 */

import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/database";
import { DeviceService } from "./DeviceService";

export interface GcashAccount {
  id: string;
  name: string;
  number: string;
  type: "main" | "reserve";
  is_active: 0 | 1;
  created_by_device_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateGcashAccountData {
  name: string;
  number: string;
  type?: "main" | "reserve";
}

export class GcashAccountService {
  /**
   * Get all GCash accounts
   */
  public static getAllAccounts(): GcashAccount[] {
    if (Platform.OS === "web") return [];

    try {
      const accounts = db.getAllSync(
        "SELECT * FROM gcash_accounts ORDER BY created_at ASC",
      );
      return accounts as GcashAccount[];
    } catch (error) {
      console.error("Error getting GCash accounts:", error);
      return [];
    }
  }

  /**
   * Get active GCash accounts only
   */
  public static getActiveAccounts(): GcashAccount[] {
    if (Platform.OS === "web") return [];

    try {
      const accounts = db.getAllSync(
        "SELECT * FROM gcash_accounts WHERE is_active = 1 ORDER BY created_at ASC",
      );
      return accounts as GcashAccount[];
    } catch (error) {
      console.error("Error getting active GCash accounts:", error);
      return [];
    }
  }

  /**
   * Get account by ID
   */
  public static getAccountById(id: string): GcashAccount | null {
    if (Platform.OS === "web") return null;

    try {
      const account = db.getFirstSync(
        "SELECT * FROM gcash_accounts WHERE id = ?",
        [id],
      );
      return (account as GcashAccount) || null;
    } catch (error) {
      console.error("Error getting GCash account:", error);
      return null;
    }
  }

  /**
   * Create new GCash account
   */
  public static async createAccount(
    data: CreateGcashAccountData,
  ): Promise<GcashAccount> {
    if (Platform.OS === "web") {
      throw new Error("Not supported on web");
    }

    try {
      const deviceId = await DeviceService.getDeviceId();

      const account: GcashAccount = {
        id: uuidv4(),
        name: data.name,
        number: data.number,
        type: data.type || "main",
        is_active: 1,
        created_by_device_id: deviceId,
        created_at: new Date().toISOString(),
      };

      db.runSync(
        `INSERT INTO gcash_accounts (id, name, number, type, is_active, created_by_device_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id,
          account.name,
          account.number,
          account.type,
          account.is_active,
          account.created_by_device_id,
          account.created_at,
        ],
      );

      console.log("✅ GCash account created:", account.name);
      return account;
    } catch (error) {
      console.error("Error creating GCash account:", error);
      throw error;
    }
  }

  /**
   * Update GCash account
   */
  public static async updateAccount(
    id: string,
    data: Partial<CreateGcashAccountData>,
  ): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name) {
        updates.push("name = ?");
        values.push(data.name);
      }
      if (data.number) {
        updates.push("number = ?");
        values.push(data.number);
      }
      if (data.type) {
        updates.push("type = ?");
        values.push(data.type);
      }

      if (updates.length === 0) return;

      updates.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(id);

      db.runSync(
        `UPDATE gcash_accounts SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );

      console.log("✅ GCash account updated:", id);
    } catch (error) {
      console.error("Error updating GCash account:", error);
      throw error;
    }
  }

  /**
   * Toggle account active status
   */
  public static async toggleAccountStatus(id: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      db.runSync(
        `UPDATE gcash_accounts 
         SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
             updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), id],
      );

      console.log("✅ GCash account status toggled:", id);
    } catch (error) {
      console.error("Error toggling account status:", error);
      throw error;
    }
  }

  /**
   * Delete GCash account
   */
  public static async deleteAccount(id: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      // Check if account has transactions
      const hasTransactions = db.getFirstSync(
        "SELECT COUNT(*) as count FROM transactions WHERE gcash_account_id = ?",
        [id],
      );

      if (hasTransactions && hasTransactions.count > 0) {
        throw new Error("Cannot delete account with existing transactions");
      }

      db.runSync("DELETE FROM gcash_accounts WHERE id = ?", [id]);
      console.log("✅ GCash account deleted:", id);
    } catch (error) {
      console.error("Error deleting GCash account:", error);
      throw error;
    }
  }

  /**
   * Upsert account (insert or update) - used during sync
   */
  public static async upsertAccount(account: GcashAccount): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const existing = this.getAccountById(account.id);

      if (existing) {
        // Update existing
        db.runSync(
          `UPDATE gcash_accounts 
           SET name = ?, number = ?, type = ?, is_active = ?, updated_at = ? 
           WHERE id = ?`,
          [
            account.name,
            account.number,
            account.type,
            account.is_active,
            new Date().toISOString(),
            account.id,
          ],
        );
      } else {
        // Insert new
        db.runSync(
          `INSERT INTO gcash_accounts (id, name, number, type, is_active, created_by_device_id, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            account.id,
            account.name,
            account.number,
            account.type,
            account.is_active,
            account.created_by_device_id,
            account.created_at,
          ],
        );
      }

      console.log("✅ GCash account upserted:", account.name);
    } catch (error) {
      console.error("Error upserting GCash account:", error);
      throw error;
    }
  }
}

export default GcashAccountService;
