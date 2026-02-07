/**
 * DEVICE SERVICE
 *
 * Manages device information and tracking for sync purposes
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/database";

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: "admin" | "staff";
  last_seen: string;
  app_version: string;
  last_sync_at?: string;
}

export class DeviceService {
  /**
   * Get or create current device ID
   */
  public static async getDeviceId(): Promise<string> {
    try {
      if (Platform.OS === "web") {
        return "web-device-001";
      }

      // Try to get existing device ID from database
      const existing = db.getFirstSync(
        "SELECT device_id FROM device_info ORDER BY last_seen DESC LIMIT 1",
      );

      if (existing?.device_id) {
        return existing.device_id;
      }

      // Create new device ID
      const deviceId = Device.osBuildId || Device.osInternalBuildId || uuidv4();
      return `device-${deviceId}`;
    } catch (error) {
      console.error("Error getting device ID:", error);
      return `device-${uuidv4()}`;
    }
  }

  /**
   * Get current device info
   */
  public static async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();
    const deviceName =
      Device.deviceName || Device.modelName || "Unknown Device";
    const appVersion = Constants.expoConfig?.version || "1.0.0";

    if (Platform.OS === "web") {
      return {
        device_id: deviceId,
        device_name: "Web Browser",
        device_type: "admin",
        last_seen: new Date().toISOString(),
        app_version: appVersion,
      };
    }

    try {
      // Check if device exists
      const existing = db.getFirstSync(
        "SELECT * FROM device_info WHERE device_id = ?",
        [deviceId],
      );

      if (existing) {
        // Update last seen
        db.runSync("UPDATE device_info SET last_seen = ? WHERE device_id = ?", [
          new Date().toISOString(),
          deviceId,
        ]);

        return existing as DeviceInfo;
      }

      // Register new device
      const newDevice: DeviceInfo = {
        device_id: deviceId,
        device_name: deviceName,
        device_type: "staff", // Default to staff, admin can change later
        last_seen: new Date().toISOString(),
        app_version: appVersion,
      };

      db.runSync(
        `INSERT INTO device_info (device_id, device_name, device_type, last_seen, app_version) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          newDevice.device_id,
          newDevice.device_name,
          newDevice.device_type,
          newDevice.last_seen,
          newDevice.app_version,
        ],
      );

      console.log("✅ Device registered:", deviceId);
      return newDevice;
    } catch (error) {
      console.error("Error getting device info:", error);
      throw error;
    }
  }

  /**
   * Update device type (admin or staff)
   */
  public static async updateDeviceType(
    deviceId: string,
    type: "admin" | "staff",
  ): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      db.runSync("UPDATE device_info SET device_type = ? WHERE device_id = ?", [
        type,
        deviceId,
      ]);
      console.log(`✅ Device type updated to ${type}`);
    } catch (error) {
      console.error("Error updating device type:", error);
      throw error;
    }
  }

  /**
   * Update last sync time
   */
  public static async updateLastSync(deviceId: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      db.runSync(
        "UPDATE device_info SET last_sync_at = ? WHERE device_id = ?",
        [new Date().toISOString(), deviceId],
      );
    } catch (error) {
      console.error("Error updating last sync:", error);
    }
  }

  /**
   * Get all registered devices
   */
  public static getAllDevices(): DeviceInfo[] {
    if (Platform.OS === "web") return [];

    try {
      const devices = db.getAllSync(
        "SELECT * FROM device_info ORDER BY last_seen DESC",
      );
      return devices as DeviceInfo[];
    } catch (error) {
      console.error("Error getting all devices:", error);
      return [];
    }
  }
}

export default DeviceService;
