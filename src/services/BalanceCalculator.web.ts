/**
 * WEB PLATFORM BALANCE CALCULATOR MOCK
 *
 * Web platform mock - returns zero balances
 */

export interface BalanceResult {
  balance: number;
  lastCalculated: string;
  transactionCount: number;
}

export const BalanceCalculator = {
  /**
   * Get cash balance (mock)
   */
  async getCashBalance(): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },

  /**
   * Get GCash account balance (mock)
   */
  async getGcashBalance(_accountId: string): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },

  /**
   * Get total GCash balance (mock)
   */
  async getTotalGcashBalance(): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },

  /**
   * Get total capital (mock)
   */
  async getTotalCapital(): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },

  /**
   * Get today's profit (mock)
   */
  async getTodayProfit(): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },

  /**
   * Get balance at specific date/time (mock)
   */
  async getBalanceAtDateTime(
    _dateTime: string,
    _accountId?: string,
  ): Promise<BalanceResult> {
    return {
      balance: 0,
      lastCalculated: new Date().toISOString(),
      transactionCount: 0,
    };
  },
};

export default BalanceCalculator;
