/**
 * WEB PLATFORM QR SYNC SERVICE MOCK
 */

export interface SyncStats {
  unsynced_count: number;
  last_sync_at: string | null;
  total_syncs: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    transactions_imported: number;
    accounts_updated: number;
    conflicts_resolved: number;
  };
}

export const QRSyncService = {
  async generateSyncQR(): Promise<string> {
    console.warn("QR generation not supported on web");
    return "";
  },

  async importFromQR(_qrData: string): Promise<SyncResult> {
    console.warn("QR import not supported on web");
    return {
      success: false,
      message: "Not supported on web platform",
    };
  },

  async getSyncStats(): Promise<SyncStats> {
    return {
      unsynced_count: 0,
      last_sync_at: null,
      total_syncs: 0,
    };
  },

  getSyncHistory(_limit?: number): any[] {
    return [];
  },
};

export default QRSyncService;
