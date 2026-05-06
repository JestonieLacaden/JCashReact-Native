/**
 * UNIFIED OFFLINE-FIRST DATABASE SCHEMA
 *
 * Single database module for the JCash React Native app.
 * Matches the Vue/Laravel SYSTEM_FLOW.md specification.
 *
 * KEY PRINCIPLES:
 * - Never store balances directly. Only store TRANSACTIONS.
 * - Each device calculates its own balance from the complete transaction history.
 * - UUID primary keys for sync compatibility across devices.
 * - Fee tiers match the Vue system (₱5 / ₱10 / ₱15 per ₱1,000 / ₱10 discounted).
 */

import { Platform } from "react-native";

// Conditional import to avoid web platform issues
let SQLite: any;
let db: any;

if (Platform.OS !== "web") {
  SQLite = require("expo-sqlite");
  db = SQLite.openDatabaseSync("jcash.db");
} else {
  // Web platform — no-op mock database
  db = {
    execSync: () => {},
    runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstSync: () => null,
    getAllSync: () => [],
  };
}

/**
 * Run database migrations for existing databases
 */
function runMigrations() {
  if (Platform.OS === "web") return;

  try {
    console.log("[Database] Running migrations...");

    // Check if transactions table exists
    const tableExists = db.getFirstSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
    );

    if (!tableExists) {
      console.log("[Database] Fresh install, no migrations needed");
      return;
    }

    // Migration 1: Add is_synced column if missing
    try {
      db.getFirstSync("SELECT is_synced FROM transactions LIMIT 1");
      console.log("[Database] is_synced column exists");
    } catch (e) {
      console.log("[Database] Adding is_synced column...");
      db.execSync(
        `ALTER TABLE transactions ADD COLUMN is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0, 1))`,
      );
      console.log("[Database] ✅ Added is_synced column");
    }

    // Migration 2: Add customer_phone column if missing
    try {
      db.getFirstSync("SELECT customer_phone FROM transactions LIMIT 1");
      console.log("[Database] customer_phone column exists");
    } catch (e) {
      console.log("[Database] Adding customer_phone column...");
      db.execSync(`ALTER TABLE transactions ADD COLUMN customer_phone TEXT`);
      console.log("[Database] ✅ Added customer_phone column");
    }

    // Migration 3: Add synced_at column if missing
    try {
      db.getFirstSync("SELECT synced_at FROM transactions LIMIT 1");
      console.log("[Database] synced_at column exists");
    } catch (e) {
      console.log("[Database] Adding synced_at column...");
      db.execSync(`ALTER TABLE transactions ADD COLUMN synced_at TEXT`);
      console.log("[Database] ✅ Added synced_at column");
    }

    // Migration 4: Add conflict_resolved column if missing
    try {
      db.getFirstSync("SELECT conflict_resolved FROM transactions LIMIT 1");
      console.log("[Database] conflict_resolved column exists");
    } catch (e) {
      console.log("[Database] Adding conflict_resolved column...");
      db.execSync(
        `ALTER TABLE transactions ADD COLUMN conflict_resolved INTEGER DEFAULT 0 CHECK(conflict_resolved IN (0, 1))`,
      );
      console.log("[Database] ✅ Added conflict_resolved column");
    }

    // Migration 5: Ensure ALL tables have correct schemas
    // Check each table for required columns; if any are missing, drop and recreate
    const tablesToCheck: Record<string, string[]> = {
      users: [
        "id",
        "name",
        "email",
        "username",
        "password",
        "role",
        "device_id",
      ],
      gcash_accounts: [
        "id",
        "name",
        "number",
        "type",
        "is_active",
        "created_by_device_id",
      ],
      transactions: [
        "id",
        "type",
        "gcash_account_id",
        "amount",
        "fee",
        "discounted",
        "status",
        "reference",
        "receiver_name",
        "customer_phone",
        "created_by_user_id",
        "created_by_device_id",
        "is_synced",
        "conflict_resolved",
      ],
      starting_balances: [
        "id",
        "cash_wallet_balance",
        "gcash_account_id",
        "gcash_balance",
        "effective_date",
        "created_by_user_id",
      ],
      fee_settings: [
        "id",
        "below_500_fee",
        "five_hundred_to_999_fee",
        "per_1000_fee",
        "discounted_per_1000_fee",
      ],
    };

    for (const [tableName, requiredCols] of Object.entries(tablesToCheck)) {
      const tableExists = db.getFirstSync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
      );
      if (!tableExists) continue;

      let needsRecreate = false;
      for (const col of requiredCols) {
        try {
          db.getFirstSync(`SELECT ${col} FROM ${tableName} LIMIT 1`);
        } catch (e) {
          console.log(`[Database] ${tableName} table missing column: ${col}`);
          needsRecreate = true;
          break;
        }
      }

      if (needsRecreate) {
        console.log(
          `[Database] ${tableName} table schema is outdated, dropping...`,
        );
        db.execSync(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`[Database] ✅ Old ${tableName} table dropped`);
      }
    }

    console.log("[Database] Migrations completed successfully");
  } catch (error) {
    console.error("[Database] Migration error:", error);
    throw error;
  }
}

/**
 * Initialize all database tables
 */
export function initializeDatabase() {
  if (Platform.OS === "web") return;

  try {
    // Run migrations first (for existing databases)
    runMigrations();

    // 1. USERS TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
        device_id TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );
    `);

    // 2. TRANSACTIONS TABLE (SOURCE OF TRUTH)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cash_in', 'cash_out', 'capital_move', 'adjustment')),
        gcash_account_id TEXT,
        from_account_id TEXT,
        to_account_id TEXT,
        amount REAL NOT NULL CHECK(amount > 0),
        fee REAL DEFAULT 0,
        discounted INTEGER DEFAULT 0 CHECK(discounted IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'cancelled')),
        reference TEXT UNIQUE NOT NULL,
        remarks TEXT,
        receiver_name TEXT,
        customer_phone TEXT,
        claimed_at TEXT,
        created_by_user_id TEXT NOT NULL,
        created_by_device_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        synced_at TEXT,
        is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0, 1)),
        conflict_resolved INTEGER DEFAULT 0 CHECK(conflict_resolved IN (0, 1)),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      );
    `);

    // Index for faster queries
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_synced ON transactions(is_synced);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_gcash_account ON transactions(gcash_account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    `);

    // 3. GCASH ACCOUNTS TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS gcash_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        number TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'main' CHECK(type IN ('main', 'reserve')),
        is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
        created_by_device_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );
    `);

    // 4. STARTING BALANCES TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS starting_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cash_wallet_balance REAL DEFAULT 0,
        gcash_account_id TEXT,
        gcash_balance REAL DEFAULT 0,
        effective_date TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (gcash_account_id) REFERENCES gcash_accounts(id),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      );
    `);

    // 5. SYNC LOG TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_method TEXT NOT NULL CHECK(sync_method IN ('qr', 'wifi', 'manual')),
        transactions_sent INTEGER DEFAULT 0,
        transactions_received INTEGER DEFAULT 0,
        conflicts_resolved INTEGER DEFAULT 0,
        synced_with_device_id TEXT,
        synced_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed'))
      );
    `);

    // 6. DEVICE INFO TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS device_info (
        device_id TEXT PRIMARY KEY NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL CHECK(device_type IN ('admin', 'staff')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        app_version TEXT NOT NULL,
        last_sync_at TEXT
      );
    `);

    // 7. FEE SETTINGS TABLE (Tier-based — matches Vue system)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS fee_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        below_500_fee REAL NOT NULL DEFAULT 5,
        five_hundred_to_999_fee REAL NOT NULL DEFAULT 10,
        per_1000_fee REAL NOT NULL DEFAULT 15,
        discounted_per_1000_fee REAL NOT NULL DEFAULT 10,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );
    `);

    console.log("✅ Database initialized successfully");

    // Auto-seed if no users exist (for fresh installs or after migration)
    const userCount = db.getFirstSync("SELECT COUNT(*) as count FROM users");
    if (userCount.count === 0) {
      console.log("[Database] No users found, seeding database...");
      seedDatabase();
    }
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}

/**
 * Seed initial data for testing
 */
export function seedDatabase() {
  if (Platform.OS === "web") return;

  try {
    // Check if already seeded
    const existingUsers = db.getAllSync("SELECT COUNT(*) as count FROM users");
    if (existingUsers[0].count > 0) {
      console.log("Database already seeded");
      return;
    }

    // Add default admin user
    const adminId = "admin-uuid-001";
    const adminDeviceId = "device-admin-001";

    db.runSync(
      `INSERT INTO users (id, name, email, username, password, role, device_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        "Administrator",
        "admin@jcash.com",
        "admin",
        "admin123",
        "admin",
        adminDeviceId,
      ],
    );

    // Register device
    db.runSync(
      `INSERT INTO device_info (device_id, device_name, device_type, app_version) 
       VALUES (?, ?, ?, ?)`,
      [adminDeviceId, "Admin Device", "admin", "1.0.0"],
    );

    // Add default GCash accounts
    const gcashAccount1 = "gcash-uuid-001";
    const gcashAccount2 = "gcash-uuid-002";

    db.runSync(
      `INSERT INTO gcash_accounts (id, name, number, type, created_by_device_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [gcashAccount1, "Main GCash", "09171234567", "main", adminDeviceId],
    );

    db.runSync(
      `INSERT INTO gcash_accounts (id, name, number, type, created_by_device_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [gcashAccount2, "Reserve GCash", "09187654321", "reserve", adminDeviceId],
    );

    // Set starting balances
    db.runSync(
      `INSERT INTO starting_balances (cash_wallet_balance, effective_date, created_by_user_id) 
       VALUES (?, DATE('now'), ?)`,
      [10000, adminId],
    );

    db.runSync(
      `INSERT INTO starting_balances (gcash_account_id, gcash_balance, effective_date, created_by_user_id) 
       VALUES (?, ?, DATE('now'), ?)`,
      [gcashAccount1, 20000, adminId],
    );

    db.runSync(
      `INSERT INTO starting_balances (gcash_account_id, gcash_balance, effective_date, created_by_user_id) 
       VALUES (?, ?, DATE('now'), ?)`,
      [gcashAccount2, 15000, adminId],
    );

    // Add default fee settings (Vue system tiers)
    db.runSync(
      `INSERT INTO fee_settings (below_500_fee, five_hundred_to_999_fee, per_1000_fee, discounted_per_1000_fee)
       VALUES (?, ?, ?, ?)`,
      [5, 10, 15, 10],
    );

    console.log("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Database seeding error:", error);
    throw error;
  }
}

/**
 * Reset database (for development/testing)
 */
export function resetDatabase() {
  if (Platform.OS === "web") return;

  try {
    const tables = [
      "users",
      "transactions",
      "gcash_accounts",
      "starting_balances",
      "sync_log",
      "device_info",
      "fee_settings",
    ];

    for (const table of tables) {
      db.execSync(`DROP TABLE IF EXISTS ${table}`);
    }

    console.log("✅ Database reset successfully");

    // Reinitialize
    initializeDatabase();
    seedDatabase();
  } catch (error) {
    console.error("❌ Database reset error:", error);
    throw error;
  }
}

export { db };
export default db;

// ============================================================
// HELPER: Get unsynced records from any table
// ============================================================
export function getUnsyncedRecords(tableName: string): any[] {
  if (Platform.OS === "web") return [];

  try {
    return db.getAllSync(`SELECT * FROM ${tableName} WHERE is_synced = 0`);
  } catch (error) {
    console.error(`Error fetching unsynced records from ${tableName}:`, error);
    return [];
  }
}

// ============================================================
// HELPER: Mark records as synced
// ============================================================
export function markAsSynced(tableName: string, ids: string[]): void {
  if (Platform.OS === "web") return;

  try {
    const placeholders = ids.map(() => "?").join(",");
    db.runSync(
      `UPDATE ${tableName} SET is_synced = 1, synced_at = ? WHERE id IN (${placeholders})`,
      [new Date().toISOString(), ...ids],
    );
  } catch (error) {
    console.error(`Error marking records as synced in ${tableName}:`, error);
  }
}
