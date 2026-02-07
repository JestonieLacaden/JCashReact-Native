/**
 * WEB PLATFORM DEVICE SERVICE MOCK
 */

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: "admin" | "staff";
  last_seen: string;
  last_sync_at?: string;
}

export const DeviceService = {
  async getDeviceId(): Promise<string> {
    return "web-device";
  },

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      device_id: "web-device",
      device_name: "Web Browser",
      device_type: "admin",
      last_seen: new Date().toISOString(),
    };
  },

  async updateDeviceType(_type: "admin" | "staff"): Promise<void> {
    console.warn("Not supported on web");
  },

  async updateLastSync(): Promise<void> {
    console.warn("Not supported on web");
  },

  getAllDevices(): DeviceInfo[] {
    return [];
  },
};

export default DeviceService;
