/**
 * WEB PLATFORM DATABASE MOCK
 *
 * Web platform doesn't support SQLite, so we provide mock implementations.
 * For a real web app, you'd use IndexedDB or a backend API.
 */

// Mock database object for web
const db = {
  execSync: () => {},
  runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
  getFirstSync: () => null,
  getAllSync: () => [],
};

/**
 * Initialize database (no-op on web)
 */
export function initializeDatabase() {
  console.warn("[Database] SQLite not available on web platform");
}

/**
 * Seed database (no-op on web)
 */
export function seedDatabase() {
  console.warn("[Database] Seed not available on web platform");
}

/**
 * Reset database (no-op on web)
 */
export function resetDatabase() {
  console.warn("[Database] Reset not available on web platform");
}

export { db };
export default db;
