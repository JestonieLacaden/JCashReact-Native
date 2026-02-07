/**
 * UNIFIED TYPE DEFINITIONS
 *
 * Single source of truth for all TypeScript types in the JCash system.
 * Matches the Vue/Laravel SYSTEM_FLOW.md specification.
 */

// ============================================================
// USER
// ============================================================
export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string; // Omitted in client-facing contexts
  role: UserRole;
  device_id: string;
  created_at: string;
  updated_at?: string;
}

export type UserRole = "admin" | "staff";

// ============================================================
// TRANSACTION
// ============================================================
export interface Transaction {
  id: string;
  type: TransactionType;
  gcash_account_id?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
  amount: number;
  fee: number;
  discounted: 0 | 1;
  status: TransactionStatus;
  reference: string;
  remarks?: string | null;
  receiver_name?: string | null;
  customer_phone?: string | null;
  claimed_at?: string | null;
  created_by_user_id: string;
  created_by_device_id: string;
  created_at: string;
  updated_at?: string | null;
  synced_at?: string | null;
  is_synced: 0 | 1;
  conflict_resolved: 0 | 1;
}

export type TransactionType =
  | "cash_in"
  | "cash_out"
  | "capital_move"
  | "adjustment";

export type TransactionStatus = "completed" | "pending" | "cancelled";

// ============================================================
// GCASH ACCOUNT
// ============================================================
export interface GcashAccount {
  id: string;
  name: string;
  number: string;
  type: GcashAccountType;
  is_active: 0 | 1;
  created_by_device_id: string;
  created_at: string;
  updated_at?: string | null;
}

export type GcashAccountType = "main" | "reserve";

// ============================================================
// STARTING BALANCE
// ============================================================
export interface StartingBalance {
  id: number;
  cash_wallet_balance?: number;
  gcash_account_id?: string | null;
  gcash_balance?: number;
  effective_date: string;
  created_by_user_id: string;
  created_at: string;
}

// ============================================================
// FEE SETTINGS (Tier-based, matching Vue system)
// ============================================================
export interface FeeSettings {
  id: number;
  /** Fee for amounts below ₱500 (default: ₱5) */
  below_500_fee: number;
  /** Fee for amounts ₱500–₱999 (default: ₱10) */
  five_hundred_to_999_fee: number;
  /** Fee per ₱1,000 (default: ₱15) */
  per_1000_fee: number;
  /** Discounted fee per ₱1,000 (default: ₱10) */
  discounted_per_1000_fee: number;
  created_at: string;
  updated_at?: string | null;
}

// ============================================================
// SYNC LOG
// ============================================================
export interface SyncLog {
  id: number;
  sync_method: SyncMethod;
  transactions_sent: number;
  transactions_received: number;
  conflicts_resolved: number;
  synced_with_device_id?: string | null;
  synced_at: string;
  status: SyncStatus;
}

export type SyncMethod = "qr" | "wifi" | "manual";
export type SyncStatus = "success" | "partial" | "failed";

// ============================================================
// DEVICE INFO
// ============================================================
export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  last_seen: string;
  app_version: string;
  last_sync_at?: string | null;
}

export type DeviceType = "admin" | "staff";

// ============================================================
// BALANCE RESULT (computed, not stored)
// ============================================================
export interface BalanceResult {
  balance: number;
  lastCalculated: string;
  transactionCount: number;
}

// ============================================================
// SYNC DATA (QR / WiFi payload)
// ============================================================
export interface SyncData {
  version: string;
  exported_by: string;
  exported_at: string;
  transactions: Transaction[];
  gcash_accounts: GcashAccount[];
  starting_balances: StartingBalance[];
  fee_settings: FeeSettings[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: SyncResultStats;
}

export interface SyncResultStats {
  transactions_imported: number;
  transactions_updated: number;
  accounts_updated: number;
  conflicts_resolved: number;
}

// ============================================================
// SERVICE INPUT TYPES
// ============================================================
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

export interface CreateGcashAccountData {
  name: string;
  number: string;
  type?: GcashAccountType;
}

// ============================================================
// DASHBOARD VIEW MODELS (computed for UI)
// ============================================================
export interface DashboardStats {
  totalGcash: number;
  cashOnHand: number;
  totalCapital: number;
  tuboToday: number;
  todayTransactionCount: number;
}

export interface GcashAccountWithBalance extends GcashAccount {
  balance: number;
  percentage: number;
  status: "active" | "low" | "empty";
}
