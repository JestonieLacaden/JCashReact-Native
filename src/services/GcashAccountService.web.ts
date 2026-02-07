/**
 * WEB PLATFORM GCASH ACCOUNT SERVICE MOCK
 */

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

export const GcashAccountService = {
  getAllAccounts(): GcashAccount[] {
    return [];
  },

  getActiveAccounts(): GcashAccount[] {
    return [];
  },

  getAccountById(_id: string): GcashAccount | null {
    return null;
  },

  createAccount(_data: any): GcashAccount {
    throw new Error("Not supported on web");
  },

  updateAccount(_id: string, _data: any): void {
    console.warn("Not supported on web");
  },

  toggleAccountStatus(_id: string): void {
    console.warn("Not supported on web");
  },

  deleteAccount(_id: string): void {
    console.warn("Not supported on web");
  },

  upsertAccount(_account: GcashAccount): void {
    console.warn("Not supported on web");
  },
};

export default GcashAccountService;
