import apiClient, { isOfflineError } from "./client";

export interface Transaction {
  id?: number;
  type: string;
  gcash_account_id?: number;
  from_account_id?: number;
  to_account_id?: number;
  amount: number;
  previous_balance?: number;
  fee?: number;
  discounted?: number;
  status?: string;
  reference?: string;
  remarks?: string;
  claimed_at?: string;
  receiver_name?: string;
  synced?: number;
  created_at?: string;
}

export interface SyncResponse {
  success: boolean;
  synced_count: number;
  failed_count?: number;
  message: string;
}

export interface PullDataResponse {
  transactions: Transaction[];
  gcash_accounts: any[];
  fee_settings?: any[];
  starting_balances?: any[];
  last_sync_at: string;
}

export interface SyncStatus {
  last_sync_at: string | null;
  pending_transactions: number;
  pending_accounts: number;
  server_status: "online" | "offline";
}

/**
 * Sync local transactions to the server
 * @param transactions - Array of transactions to sync
 * @returns Promise with sync response
 */
export const syncTransactions = async (
  transactions: Transaction[],
): Promise<SyncResponse> => {
  try {
    if (!transactions || transactions.length === 0) {
      return {
        success: true,
        synced_count: 0,
        message: "No transactions to sync",
      };
    }

    const response = await apiClient.post<SyncResponse>("/sync/transactions", {
      transactions,
    });

    console.log(
      `[Sync] Successfully synced ${response.data.synced_count} transactions`,
    );
    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("[Sync] Offline - transactions will be synced later");
      throw new Error("Unable to sync: No internet connection");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Failed to sync transactions. Please try again.");
  }
};

/**
 * Pull data from server (get latest updates)
 * @returns Promise with all synced data from server
 */
export const pullData = async (): Promise<PullDataResponse> => {
  try {
    const response = await apiClient.get<PullDataResponse>("/sync/pull");

    console.log("[Sync] Data pulled successfully from server");
    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("[Sync] Offline - unable to pull data from server");
      throw new Error("Unable to pull data: No internet connection");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Failed to pull data from server");
  }
};

/**
 * Get sync status from server
 * @returns Promise with sync status information
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  try {
    const response = await apiClient.get<SyncStatus>("/sync/status");

    return {
      ...response.data,
      server_status: "online",
    };
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("[Sync] Server is offline or unreachable");
      return {
        last_sync_at: null,
        pending_transactions: 0,
        pending_accounts: 0,
        server_status: "offline",
      };
    }

    throw new Error("Failed to get sync status");
  }
};

/**
 * Sync all local data to server
 * This is a comprehensive sync that sends all unsynced data
 * @param data - Object containing all data types to sync
 */
export const syncAllData = async (data: {
  transactions?: Transaction[];
  gcash_accounts?: any[];
  fee_settings?: any[];
  starting_balances?: any[];
}): Promise<{ success: boolean; message: string; errors?: string[] }> => {
  try {
    const response = await apiClient.post("/sync/all", data);

    console.log("[Sync] All data synced successfully");
    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn(
        "[Sync] Offline - data will be synced when connection is restored",
      );
      throw new Error("Unable to sync: No internet connection");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Failed to sync data");
  }
};

/**
 * Push specific table data to server
 * Generic function for syncing any table
 */
export const pushTableData = async (
  tableName: string,
  data: any[],
): Promise<SyncResponse> => {
  try {
    if (!data || data.length === 0) {
      return {
        success: true,
        synced_count: 0,
        message: `No ${tableName} to sync`,
      };
    }

    const response = await apiClient.post<SyncResponse>(`/sync/${tableName}`, {
      data,
    });

    console.log(
      `[Sync] Successfully synced ${response.data.synced_count} ${tableName}`,
    );
    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn(`[Sync] Offline - ${tableName} will be synced later`);
      throw new Error("Unable to sync: No internet connection");
    }

    throw new Error(`Failed to sync ${tableName}`);
  }
};

/**
 * Test connection to server
 * @returns boolean indicating if server is reachable
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get("/ping", { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
};
