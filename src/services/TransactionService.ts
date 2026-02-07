/**
 * TRANSACTION SERVICE
 *
 * Handles creating all types of transactions with UUID support.
 * All transactions are stored locally and synced later via QR codes.
 *
 * Transaction Types:
 * - cash_in: Customer brings cash, we send to their GCash
 * - cash_out: Customer withdraws cash, we receive from their GCash
 * - capital_move: Admin moves money between accounts
 * - adjustment: Manual balance correction by admin
 */

import * as Device from "expo-device";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/database";

export interface Transaction {
  id: string;
  type: "cash_in" | "cash_out" | "capital_move" | "adjustment";
  gcash_account_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  amount: number;
  fee: number;
  discounted: 0 | 1;
  status: "completed" | "pending" | "cancelled";
  reference: string;
  remarks?: string;
  receiver_name?: string;
  customer_phone?: string;
  claimed_at?: string;
  created_by_user_id: string;
  created_by_device_id: string;
  created_at: string;
  updated_at?: string;
  synced_at?: string;
  is_synced: 0 | 1;
  conflict_resolved: 0 | 1;
}

export interface CashInData {
  gcashAccountId: string;
  amount: number;
  fee: number;
  discounted?: boolean;
  receiverName?: string;
  customerPhone?: string;
  remarks?: string;
}

export interface CashOutData {
  gcashAccountId: string;
  amount: number;
  fee: number;
  discounted?: boolean;
  receiverName?: string;
  customerPhone?: string;
  remarks?: string;
}

export interface CapitalMoveData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  remarks?: string;
}

export interface AdjustmentData {
  accountType: "cash" | "gcash";
  accountId?: string;
  amount: number; // Can be negative
  reason: string;
}

export class TransactionService {
  /**
   * Get current device ID
   */
  private static async getDeviceId(): Promise<string> {
    try {
      const deviceId = Device.osBuildId || Device.osInternalBuildId || uuidv4();
      return `device-${deviceId}`;
    } catch {
      return `device-${uuidv4()}`;
    }
  }

  /**
   * Generate unique reference number
   * Format: JCYYYYMMDD-XXXX
   */
  private static generateReference(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return `JC${year}${month}${day}-${random}`;
  }

  /**
   * Get current user from local storage/auth
   */
  private static async getCurrentUser(): Promise<{ id: string; role: string }> {
    if (Platform.OS === "web") {
      return { id: "admin-uuid-001", role: "admin" };
    }

    try {
      // Get from database or auth store
      const user = db.getFirstSync("SELECT id, role FROM users LIMIT 1");
      if (!user) throw new Error("No user found");

      return { id: user.id, role: user.role };
    } catch (error) {
      console.error("Error getting current user:", error);
      throw new Error("User not authenticated");
    }
  }

  /**
   * Create Cash In Transaction
   * Customer brings cash → We receive it → We send to their GCash
   */
  public static async createCashIn(data: CashInData): Promise<Transaction> {
    if (Platform.OS === "web") {
      throw new Error("Not supported on web");
    }

    // Validate
    if (data.amount <= 0) {
      throw new Error("Amount must be positive");
    }
    if (!data.gcashAccountId) {
      throw new Error("GCash account is required");
    }

    const currentUser = await this.getCurrentUser();
    const deviceId = await this.getDeviceId();

    const transaction: Transaction = {
      id: uuidv4(), // ⚠️ CRITICAL: UUID not auto-increment
      type: "cash_in",
      gcash_account_id: data.gcashAccountId,
      amount: data.amount,
      fee: data.fee || 0,
      discounted: data.discounted ? 1 : 0,
      status: "completed",
      reference: this.generateReference(),
      remarks: data.remarks || undefined,
      receiver_name: data.receiverName || undefined,
      customer_phone: data.customerPhone || undefined,
      created_by_user_id: currentUser.id,
      created_by_device_id: deviceId,
      created_at: new Date().toISOString(),
      is_synced: 0,
      conflict_resolved: 0,
    };

    // Insert into database
    db.runSync(
      `INSERT INTO transactions (
        id, type, gcash_account_id, amount, fee, discounted, status, 
        reference, remarks, receiver_name, customer_phone, created_by_user_id, 
        created_by_device_id, created_at, is_synced, conflict_resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.type,
        transaction.gcash_account_id,
        transaction.amount,
        transaction.fee,
        transaction.discounted,
        transaction.status,
        transaction.reference,
        transaction.remarks,
        transaction.receiver_name,
        transaction.customer_phone,
        transaction.created_by_user_id,
        transaction.created_by_device_id,
        transaction.created_at,
        transaction.is_synced,
        transaction.conflict_resolved,
      ],
    );

    console.log("✅ Cash In transaction created:", transaction.reference);
    return transaction;
  }

  /**
   * Create Cash Out Transaction
   * Customer withdraws cash → We receive from their GCash → We give them cash
   */
  public static async createCashOut(data: CashOutData): Promise<Transaction> {
    if (Platform.OS === "web") {
      throw new Error("Not supported on web");
    }

    // Validate
    if (data.amount <= 0) {
      throw new Error("Amount must be positive");
    }
    if (!data.gcashAccountId) {
      throw new Error("GCash account is required");
    }

    const currentUser = await this.getCurrentUser();
    const deviceId = await this.getDeviceId();

    const transaction: Transaction = {
      id: uuidv4(),
      type: "cash_out",
      gcash_account_id: data.gcashAccountId,
      amount: data.amount,
      fee: data.fee || 0,
      discounted: data.discounted ? 1 : 0,
      status: "completed",
      reference: this.generateReference(),
      remarks: data.remarks || undefined,
      receiver_name: data.receiverName || undefined,
      customer_phone: data.customerPhone || undefined,
      created_by_user_id: currentUser.id,
      created_by_device_id: deviceId,
      created_at: new Date().toISOString(),
      is_synced: 0,
      conflict_resolved: 0,
    };

    db.runSync(
      `INSERT INTO transactions (
        id, type, gcash_account_id, amount, fee, discounted, status, 
        reference, remarks, receiver_name, customer_phone, created_by_user_id, 
        created_by_device_id, created_at, is_synced, conflict_resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.type,
        transaction.gcash_account_id,
        transaction.amount,
        transaction.fee,
        transaction.discounted,
        transaction.status,
        transaction.reference,
        transaction.remarks,
        transaction.receiver_name,
        transaction.customer_phone,
        transaction.created_by_user_id,
        transaction.created_by_device_id,
        transaction.created_at,
        transaction.is_synced,
        transaction.conflict_resolved,
      ],
    );

    console.log("✅ Cash Out transaction created:", transaction.reference);
    return transaction;
  }

  /**
   * Create Capital Move Transaction (Admin only)
   * Move money between accounts (e.g., GCash to Cash Wallet)
   */
  public static async createCapitalMove(
    data: CapitalMoveData,
  ): Promise<Transaction> {
    if (Platform.OS === "web") {
      throw new Error("Not supported on web");
    }

    const currentUser = await this.getCurrentUser();

    // Only admin can move capital
    if (currentUser.role !== "admin") {
      throw new Error("Only admin can move capital");
    }

    if (data.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const deviceId = await this.getDeviceId();

    const transaction: Transaction = {
      id: uuidv4(),
      type: "capital_move",
      from_account_id: data.fromAccountId,
      to_account_id: data.toAccountId,
      amount: data.amount,
      fee: 0,
      discounted: 0,
      status: "completed",
      reference: this.generateReference(),
      remarks: data.remarks || "Capital transfer",
      created_by_user_id: currentUser.id,
      created_by_device_id: deviceId,
      created_at: new Date().toISOString(),
      is_synced: 0,
      conflict_resolved: 0,
    };

    db.runSync(
      `INSERT INTO transactions (
        id, type, from_account_id, to_account_id, amount, fee, discounted, 
        status, reference, remarks, created_by_user_id, created_by_device_id, 
        created_at, is_synced, conflict_resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.type,
        transaction.from_account_id,
        transaction.to_account_id,
        transaction.amount,
        transaction.fee,
        transaction.discounted,
        transaction.status,
        transaction.reference,
        transaction.remarks,
        transaction.created_by_user_id,
        transaction.created_by_device_id,
        transaction.created_at,
        transaction.is_synced,
        transaction.conflict_resolved,
      ],
    );

    console.log("✅ Capital Move transaction created:", transaction.reference);
    return transaction;
  }

  /**
   * Create Adjustment Transaction (Admin only)
   * Manual balance correction
   */
  public static async createAdjustment(
    data: AdjustmentData,
  ): Promise<Transaction> {
    if (Platform.OS === "web") {
      throw new Error("Not supported on web");
    }

    const currentUser = await this.getCurrentUser();

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can create adjustments");
    }

    const deviceId = await this.getDeviceId();

    const transaction: Transaction = {
      id: uuidv4(),
      type: "adjustment",
      gcash_account_id:
        data.accountType === "gcash" ? data.accountId : undefined,
      amount: data.amount, // Can be negative
      fee: 0,
      discounted: 0,
      status: "completed",
      reference: this.generateReference(),
      remarks: `Adjustment: ${data.reason}`,
      created_by_user_id: currentUser.id,
      created_by_device_id: deviceId,
      created_at: new Date().toISOString(),
      is_synced: 0,
      conflict_resolved: 0,
    };

    db.runSync(
      `INSERT INTO transactions (
        id, type, gcash_account_id, amount, fee, discounted, status, 
        reference, remarks, created_by_user_id, created_by_device_id, 
        created_at, is_synced, conflict_resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.type,
        transaction.gcash_account_id,
        transaction.amount,
        transaction.fee,
        transaction.discounted,
        transaction.status,
        transaction.reference,
        transaction.remarks,
        transaction.created_by_user_id,
        transaction.created_by_device_id,
        transaction.created_at,
        transaction.is_synced,
        transaction.conflict_resolved,
      ],
    );

    console.log("✅ Adjustment transaction created:", transaction.reference);
    return transaction;
  }

  /**
   * Get all transactions
   */
  public static getAllTransactions(): Transaction[] {
    if (Platform.OS === "web") return [];

    try {
      const transactions = db.getAllSync(
        "SELECT * FROM transactions ORDER BY created_at DESC",
      );
      return transactions as Transaction[];
    } catch (error) {
      console.error("Error getting transactions:", error);
      return [];
    }
  }

  /**
   * Get unsynced transactions for export
   */
  public static getUnsyncedTransactions(): Transaction[] {
    if (Platform.OS === "web") return [];

    try {
      const transactions = db.getAllSync(
        "SELECT * FROM transactions WHERE is_synced = 0 ORDER BY created_at ASC",
      );
      return transactions as Transaction[];
    } catch (error) {
      console.error("Error getting unsynced transactions:", error);
      return [];
    }
  }

  /**
   * Mark transactions as synced
   */
  public static markTransactionsAsSynced(transactionIds: string[]): void {
    if (Platform.OS === "web") return;

    try {
      const placeholders = transactionIds.map(() => "?").join(",");
      db.runSync(
        `UPDATE transactions 
         SET is_synced = 1, synced_at = ? 
         WHERE id IN (${placeholders})`,
        [new Date().toISOString(), ...transactionIds],
      );

      console.log(`✅ Marked ${transactionIds.length} transactions as synced`);
    } catch (error) {
      console.error("Error marking transactions as synced:", error);
    }
  }

  /**
   * Get transaction by ID
   */
  public static getTransactionById(id: string): Transaction | null {
    if (Platform.OS === "web") return null;

    try {
      const transaction = db.getFirstSync(
        "SELECT * FROM transactions WHERE id = ?",
        [id],
      );
      return (transaction as Transaction) || null;
    } catch (error) {
      console.error("Error getting transaction:", error);
      return null;
    }
  }

  /**
   * Get transactions by date range
   */
  public static getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Transaction[] {
    if (Platform.OS === "web") return [];

    try {
      const transactions = db.getAllSync(
        `SELECT * FROM transactions 
         WHERE created_at BETWEEN ? AND ? 
         ORDER BY created_at DESC`,
        [startDate, endDate],
      );
      return transactions as Transaction[];
    } catch (error) {
      console.error("Error getting transactions by date range:", error);
      return [];
    }
  }
}

export default TransactionService;
