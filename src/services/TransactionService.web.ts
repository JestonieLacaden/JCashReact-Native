/**
 * WEB PLATFORM TRANSACTION SERVICE MOCK
 */

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
  claimed_at?: string;
  created_by_user_id: string;
  created_by_device_id: string;
  created_at: string;
  updated_at?: string;
  synced_at?: string;
  is_synced: 0 | 1;
  conflict_resolved: 0 | 1;
}

export const TransactionService = {
  createCashIn(_data: any): Transaction {
    throw new Error("Not supported on web");
  },

  createCashOut(_data: any): Transaction {
    throw new Error("Not supported on web");
  },

  createCapitalMove(_data: any): Transaction {
    throw new Error("Not supported on web");
  },

  createAdjustment(_data: any): Transaction {
    throw new Error("Not supported on web");
  },

  getUnsyncedTransactions(): Transaction[] {
    return [];
  },

  getAllTransactions(): Transaction[] {
    return [];
  },

  getTransactionById(_id: string): Transaction | null {
    return null;
  },

  markTransactionsAsSynced(_ids: string[]): void {
    console.warn("Not supported on web");
  },
};

export default TransactionService;
