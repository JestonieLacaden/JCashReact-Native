import apiClient from "./client";

export interface DashboardStats {
  totalGcash: number;
  cashOnHand: number;
  totalCapital: number;
  tuboToday: number;
}

export interface GCashAccount {
  id: number;
  name: string;
  balance: number;
  percentage: number;
  status: "active" | "low" | "empty";
}

export interface DashboardData {
  stats: DashboardStats;
  gcashAccounts: GCashAccount[];
}

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardData> => {
  try {
    const response = await apiClient.get<DashboardData>("/dashboard");
    return response.data;
  } catch (error: any) {
    console.error("[Dashboard API] Error fetching stats:", error);
    throw error;
  }
};

/**
 * Get GCash accounts
 */
export const getGCashAccounts = async (): Promise<GCashAccount[]> => {
  try {
    const response = await apiClient.get<GCashAccount[]>("/gcash-accounts");
    return response.data;
  } catch (error: any) {
    console.error("[Dashboard API] Error fetching GCash accounts:", error);
    throw error;
  }
};
