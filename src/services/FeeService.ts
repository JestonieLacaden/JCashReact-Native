/**
 * FEE SERVICE
 *
 * Implements the Vue system's tier-based fee calculation.
 *
 * Fee Tiers (from SYSTEM_FLOW.md):
 * - Below ₱500:       ₱5.00 fixed
 * - ₱500 – ₱999:      ₱10.00 fixed
 * - Per ₱1,000:        ₱15.00 (regular) / ₱10.00 (discounted)
 *
 * Example: ₱3,500 regular → 3 × ₱15 + ₱10 (for the ₱500 remainder) = ₱55
 * Example: ₱3,500 discounted → 3 × ₱10 + ₱10 (for the ₱500 remainder) = ₱40
 */

import { Platform } from "react-native";
import { db } from "../database/database";
import type { FeeSettings } from "../types";

// Default fee tiers (used if DB has no fee_settings row)
const DEFAULT_FEES: FeeSettings = {
  id: 0,
  below_500_fee: 5,
  five_hundred_to_999_fee: 10,
  per_1000_fee: 15,
  discounted_per_1000_fee: 10,
  created_at: "",
};

export class FeeService {
  /**
   * Load fee settings from the database (or use defaults)
   */
  public static getFeeSettings(): FeeSettings {
    if (Platform.OS === "web") return DEFAULT_FEES;

    try {
      const row = db.getFirstSync(
        "SELECT * FROM fee_settings ORDER BY id DESC LIMIT 1",
      );
      if (row) return row as FeeSettings;
      return DEFAULT_FEES;
    } catch (error) {
      console.error("Error loading fee settings:", error);
      return DEFAULT_FEES;
    }
  }

  /**
   * Compute the fee for a given amount.
   *
   * @param amount   — the transaction amount in pesos
   * @param discounted — whether to use the discounted rate
   * @returns the computed fee (always ≥ 0)
   */
  public static computeFee(amount: number, discounted = false): number {
    if (amount <= 0) return 0;

    const settings = this.getFeeSettings();

    if (amount < 500) {
      return settings.below_500_fee; // ₱5
    }

    if (amount < 1000) {
      return settings.five_hundred_to_999_fee; // ₱10
    }

    // ₱1,000 and above: per-₱1,000 tier + remainder tier
    const feePerThousand = discounted
      ? settings.discounted_per_1000_fee
      : settings.per_1000_fee;

    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;

    let fee = thousands * feePerThousand;

    // Add fee for the remainder
    if (remainder > 0 && remainder < 500) {
      fee += settings.below_500_fee;
    } else if (remainder >= 500) {
      fee += settings.five_hundred_to_999_fee;
    }

    return fee;
  }

  /**
   * Update fee settings in the database (admin only)
   */
  public static updateFeeSettings(
    updates: Partial<Omit<FeeSettings, "id" | "created_at" | "updated_at">>,
  ): void {
    if (Platform.OS === "web") return;

    try {
      const current = this.getFeeSettings();

      const below = updates.below_500_fee ?? current.below_500_fee;
      const fiveHundred =
        updates.five_hundred_to_999_fee ?? current.five_hundred_to_999_fee;
      const per1000 = updates.per_1000_fee ?? current.per_1000_fee;
      const disc =
        updates.discounted_per_1000_fee ?? current.discounted_per_1000_fee;

      if (current.id === 0) {
        // No row yet — insert
        db.runSync(
          `INSERT INTO fee_settings
             (below_500_fee, five_hundred_to_999_fee, per_1000_fee, discounted_per_1000_fee)
           VALUES (?, ?, ?, ?)`,
          [below, fiveHundred, per1000, disc],
        );
      } else {
        db.runSync(
          `UPDATE fee_settings
           SET below_500_fee = ?, five_hundred_to_999_fee = ?, per_1000_fee = ?,
               discounted_per_1000_fee = ?, updated_at = ?
           WHERE id = ?`,
          [
            below,
            fiveHundred,
            per1000,
            disc,
            new Date().toISOString(),
            current.id,
          ],
        );
      }

      console.log("✅ Fee settings updated");
    } catch (error) {
      console.error("Error updating fee settings:", error);
      throw error;
    }
  }
}

export default FeeService;
