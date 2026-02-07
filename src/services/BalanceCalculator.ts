/**
 * BALANCE CALCULATOR SERVICE
 *
 * ⭐ MOST IMPORTANT SERVICE ⭐
 *
 * This service calculates all balances on-the-fly from the transaction history.
 * NEVER stores balances directly in the database.
 *
 * WHY: This prevents data conflicts when multiple devices work offline and sync later.
 *
 * PRINCIPLE: Balances = Starting Balance + Sum of all transactions
 */

import { Platform } from "react-native";
import { db } from "../database/database";

export interface Transaction {
  id: string;
  type: "cash_in" | "cash_out" | "capital_move" | "adjustment";
  gcash_account_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  amount: number;
  fee: number;
  status: string;
  created_at: string;
}

export interface BalanceResult {
  balance: number;
  lastCalculated: string;
  transactionCount: number;
}

export class BalanceCalculator {
  /**
   * Get starting cash wallet balance
   */
  private static getStartingCashBalance(): number {
    if (Platform.OS === "web") return 0;

    try {
      const result = db.getFirstSync(
        `SELECT cash_wallet_balance FROM starting_balances 
         WHERE cash_wallet_balance IS NOT NULL 
         ORDER BY effective_date DESC LIMIT 1`,
      );

      return result?.cash_wallet_balance || 0;
    } catch (error) {
      console.error("Error getting starting cash balance:", error);
      return 0;
    }
  }

  /**
   * Get starting GCash account balance
   */
  private static getStartingGcashBalance(accountId: string): number {
    if (Platform.OS === "web") return 0;

    try {
      const result = db.getFirstSync(
        `SELECT gcash_balance FROM starting_balances 
         WHERE gcash_account_id = ? 
         ORDER BY effective_date DESC LIMIT 1`,
        [accountId],
      );

      return result?.gcash_balance || 0;
    } catch (error) {
      console.error("Error getting starting GCash balance:", error);
      return 0;
    }
  }

  /**
   * Get all completed transactions
   */
  private static getAllCompletedTransactions(): Transaction[] {
    if (Platform.OS === "web") return [];

    try {
      const transactions = db.getAllSync(
        `SELECT * FROM transactions 
         WHERE status = 'completed' 
         ORDER BY created_at ASC`,
      );

      return transactions as Transaction[];
    } catch (error) {
      console.error("Error getting transactions:", error);
      return [];
    }
  }

  /**
   * Get transactions for specific GCash account
   */
  private static getTransactionsForAccount(accountId: string): Transaction[] {
    if (Platform.OS === "web") return [];

    try {
      const transactions = db.getAllSync(
        `SELECT * FROM transactions 
         WHERE status = 'completed' 
         AND (
           gcash_account_id = ? 
           OR from_account_id = ? 
           OR to_account_id = ?
         ) 
         ORDER BY created_at ASC`,
        [accountId, accountId, accountId],
      );

      return transactions as Transaction[];
    } catch (error) {
      console.error("Error getting account transactions:", error);
      return [];
    }
  }

  /**
   * Calculate current cash wallet balance
   *
   * LOGIC:
   * - Start with starting_balance
   * - cash_in: Customer brings cash → we RECEIVE it (+amount +fee)
   * - cash_out: Customer withdraws cash → we GIVE it (-amount +fee)
   * - capital_move TO cash_wallet: Admin adds capital (+amount)
   * - capital_move FROM cash_wallet: Admin removes capital (-amount)
   * - adjustment: Manual correction by admin (can be + or -)
   */
  public static async getCashBalance(): Promise<BalanceResult> {
    const starting = this.getStartingCashBalance();
    const transactions = this.getAllCompletedTransactions();

    let balance = starting;
    let transactionCount = 0;

    for (const tx of transactions) {
      if (tx.type === "cash_in") {
        // Customer brings cash, we receive it
        balance += tx.amount + tx.fee;
        transactionCount++;
      } else if (tx.type === "cash_out") {
        // Customer withdraws cash, we give it (but keep the fee)
        balance -= tx.amount - tx.fee;
        transactionCount++;
      } else if (tx.type === "capital_move") {
        // Admin moves money from GCash to Cash or vice versa
        if (tx.to_account_id === "cash_wallet") {
          balance += tx.amount;
          transactionCount++;
        } else if (tx.from_account_id === "cash_wallet") {
          balance -= tx.amount;
          transactionCount++;
        }
      } else if (tx.type === "adjustment") {
        // Manual adjustment by admin (amount can be negative)
        balance += tx.amount;
        transactionCount++;
      }
    }

    return {
      balance,
      lastCalculated: new Date().toISOString(),
      transactionCount,
    };
  }

  /**
   * Calculate GCash account balance
   *
   * LOGIC:
   * - Start with starting_balance for this account
   * - cash_in: We SEND to customer's GCash (-amount)
   * - cash_out: We RECEIVE from customer's GCash (+amount)
   * - capital_move FROM this account: Admin removes capital (-amount)
   * - capital_move TO this account: Admin adds capital (+amount)
   */
  public static async getGcashBalance(
    accountId: string,
  ): Promise<BalanceResult> {
    const starting = this.getStartingGcashBalance(accountId);
    const transactions = this.getTransactionsForAccount(accountId);

    let balance = starting;
    let transactionCount = 0;

    for (const tx of transactions) {
      if (tx.type === "cash_in") {
        // We send to customer's GCash
        balance -= tx.amount;
        transactionCount++;
      } else if (tx.type === "cash_out") {
        // We receive from customer's GCash
        balance += tx.amount;
        transactionCount++;
      } else if (tx.type === "capital_move") {
        if (tx.from_account_id === accountId) {
          // Money leaving this account
          balance -= tx.amount;
          transactionCount++;
        }
        if (tx.to_account_id === accountId) {
          // Money entering this account
          balance += tx.amount;
          transactionCount++;
        }
      }
    }

    return {
      balance,
      lastCalculated: new Date().toISOString(),
      transactionCount,
    };
  }

  /**
   * Calculate balance at specific date/time
   * Useful for historical reports
   */
  public static async getBalanceAtDateTime(
    accountType: "cash" | "gcash",
    dateTime: string,
    accountId?: string,
  ): Promise<BalanceResult> {
    if (Platform.OS === "web") {
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }

    try {
      let starting = 0;
      let transactions: Transaction[] = [];

      if (accountType === "cash") {
        starting = this.getStartingCashBalance();
        transactions = db.getAllSync(
          `SELECT * FROM transactions 
           WHERE status = 'completed' 
           AND created_at <= ? 
           ORDER BY created_at ASC`,
          [dateTime],
        ) as Transaction[];
      } else {
        if (!accountId)
          throw new Error("Account ID required for GCash balance");

        starting = this.getStartingGcashBalance(accountId);
        transactions = db.getAllSync(
          `SELECT * FROM transactions 
           WHERE status = 'completed' 
           AND created_at <= ? 
           AND (
             gcash_account_id = ? 
             OR from_account_id = ? 
             OR to_account_id = ?
           ) 
           ORDER BY created_at ASC`,
          [dateTime, accountId, accountId, accountId],
        ) as Transaction[];
      }

      let balance = starting;
      let transactionCount = 0;

      for (const tx of transactions) {
        if (accountType === "cash") {
          // Cash wallet logic
          if (tx.type === "cash_in") {
            balance += tx.amount + tx.fee;
            transactionCount++;
          } else if (tx.type === "cash_out") {
            balance -= tx.amount - tx.fee;
            transactionCount++;
          } else if (tx.type === "capital_move") {
            if (tx.to_account_id === "cash_wallet") {
              balance += tx.amount;
              transactionCount++;
            } else if (tx.from_account_id === "cash_wallet") {
              balance -= tx.amount;
              transactionCount++;
            }
          } else if (tx.type === "adjustment") {
            balance += tx.amount;
            transactionCount++;
          }
        } else {
          // GCash account logic
          if (tx.type === "cash_in") {
            balance -= tx.amount;
            transactionCount++;
          } else if (tx.type === "cash_out") {
            balance += tx.amount;
            transactionCount++;
          } else if (tx.type === "capital_move") {
            if (tx.from_account_id === accountId) {
              balance -= tx.amount;
              transactionCount++;
            }
            if (tx.to_account_id === accountId) {
              balance += tx.amount;
              transactionCount++;
            }
          }
        }
      }

      return {
        balance,
        lastCalculated: new Date().toISOString(),
        transactionCount,
      };
    } catch (error) {
      console.error("Error calculating balance at datetime:", error);
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }
  }

  /**
   * Get total GCash balance (all accounts combined)
   */
  public static async getTotalGcashBalance(): Promise<BalanceResult> {
    if (Platform.OS === "web") {
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }

    try {
      const accounts = db.getAllSync(
        "SELECT id FROM gcash_accounts WHERE is_active = 1",
      );

      let totalBalance = 0;
      let totalTransactionCount = 0;

      for (const account of accounts) {
        const result = await this.getGcashBalance(account.id);
        totalBalance += result.balance;
        totalTransactionCount += result.transactionCount;
      }

      return {
        balance: totalBalance,
        lastCalculated: new Date().toISOString(),
        transactionCount: totalTransactionCount,
      };
    } catch (error) {
      console.error("Error calculating total GCash balance:", error);
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }
  }

  /**
   * Get total capital (Cash + all GCash accounts)
   */
  public static async getTotalCapital(): Promise<BalanceResult> {
    const cashResult = await this.getCashBalance();
    const gcashResult = await this.getTotalGcashBalance();

    return {
      balance: cashResult.balance + gcashResult.balance,
      lastCalculated: new Date().toISOString(),
      transactionCount:
        cashResult.transactionCount + gcashResult.transactionCount,
    };
  }

  /**
   * Calculate today's profit (tubo)
   * Profit = All fees collected today
   */
  public static async getTodayProfit(): Promise<BalanceResult> {
    if (Platform.OS === "web") {
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartISO = todayStart.toISOString();

      const transactions = db.getAllSync(
        `SELECT * FROM transactions 
         WHERE status = 'completed' 
         AND created_at >= ? 
         AND type IN ('cash_in', 'cash_out')`,
        [todayStartISO],
      ) as Transaction[];

      let profit = 0;
      let transactionCount = 0;

      for (const tx of transactions) {
        profit += tx.fee;
        transactionCount++;
      }

      return {
        balance: profit,
        lastCalculated: new Date().toISOString(),
        transactionCount,
      };
    } catch (error) {
      console.error("Error calculating today profit:", error);
      return {
        balance: 0,
        lastCalculated: new Date().toISOString(),
        transactionCount: 0,
      };
    }
  }
}

export default BalanceCalculator;
