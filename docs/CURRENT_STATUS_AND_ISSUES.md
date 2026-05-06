# JCash Mobile Current Status And Issues

## What Is Already Working

Based on the current codebase, these areas are already substantially implemented:

### Core mobile foundation

- Expo + React Native app setup
- file-based routing with Expo Router
- local SQLite database initialization
- local auth/session persistence
- admin/staff role concept

### Transaction recording

- cash in creation
- cash out creation
- capital movement creation
- manual adjustment creation

Main file:

- `src/services/TransactionService.ts`

### Balance computation

- cash on hand
- per-account GCash balance
- total GCash
- total capital
- today profit

Main file:

- `src/services/BalanceCalculator.ts`

### Main screens

- login
- home dashboard
- history
- new transaction
- funds management
- settings
- sync
- QR generator
- QR scanner

### Sync building blocks

- sync flags on transactions
- device info tracking
- sync log table
- QR export/import flow
- HTTP sync utility and API client

## What The Current App Feels Like

The app is already beyond prototype stage in structure, but it is still in transition.

It currently feels like:

- business logic is fairly clear
- offline-first direction is correct
- UI is partially modernized
- some old screen patterns still coexist with newer mobile-first screens
- sync design is not fully unified yet

So this is not "empty work". It is a real working base with technical debt.

## Important Observations

### 1. There are duplicate or overlapping flows

Examples:

- `NewTransactionScreen` exists as the main transaction entry UX
- `CashInScreen` and `CashOutScreen` also exist as separate older flows

This means the project has more than one UI path for similar tasks.

Recommended direction:

- keep one primary transaction-entry experience
- downgrade or remove legacy duplicate screens later

### 2. Two sync systems currently coexist

The codebase mixes:

- backend HTTP sync
- QR/device sync

This is not automatically wrong, but it creates product ambiguity.

Recommended direction:

- decide which sync path is primary
- treat the other as optional or secondary

For your stated offline mobile goal, QR/offline exchange is closer to the product identity.

### 3. Mobile-first intent is correct, but some screens still carry web-form habits

Examples:

- long form sections
- desktop-style settings behaviors
- multiple overlapping transaction entry screens

Recommended direction:

- keep reducing taps
- reduce duplicate inputs
- make important actions thumb-friendly
- prioritize quick transaction entry over feature density

## Likely Bugs Or Risk Areas

These are based on the current code, not just assumptions.

### 1. Auth fallback may restore an invalid token shape

In `src/store/authStore.ts`, `loadUser()` falls back to SQLite and reads `dbUser.token`, but the `users` table in `src/database/database.ts` does not define a `token` column.

Risk:

- restored session token may be `undefined`
- auth restoration behavior may be inconsistent

### 2. Current user lookup is too loose

In `src/services/TransactionService.ts`, `getCurrentUser()` fetches the first user from the local database:

- `SELECT id, role FROM users LIMIT 1`

Risk:

- transactions may be attributed to the wrong local user if more than one user exists
- active logged-in user is not explicitly respected

### 3. User-entered reference fields are currently ignored

`NewTransactionScreen`, `CashInScreen`, and `CashOutScreen` collect a reference input, but `TransactionService` generates its own reference internally and does not accept the typed reference.

Risk:

- operator thinks custom reference was saved
- saved transaction does not match UI expectation

### 4. Cash out validation comment does not match actual enforcement

`CashOutScreen` loads current cash balance and comments about balance checking, but the submit validation does not actually block transactions based on insufficient available cash.

Risk:

- invalid cash out can still be recorded

### 5. QR payload size may become a scaling problem

`QRSyncService.generateSyncQR()` compresses unsynced data into a single QR payload.

Risk:

- too many unsynced transactions can exceed practical QR size limits
- scan reliability will drop as data grows

### 6. Android compatibility risk in settings prompt

`SettingsScreen` uses `Alert.prompt()` for changing server URL.

Risk:

- this is not reliably available across Android environments
- the server URL change flow may fail on the main target platform

### 7. Sync status sources are split

Different parts of the app read sync state from different logic paths:

- `QRSyncService.getSyncStats()`
- `syncStore`
- `syncManager`

Risk:

- inconsistent UI status
- different screens reporting different sync realities

## Recommended Next Work Order

This is the order that makes the most sense for slow, controlled cleanup.

### Phase 1: Documentation and shared understanding

- keep the new docs updated
- define the true primary user flow
- decide the primary sync path

### Phase 2: Transaction flow cleanup

- make one main transaction entry screen
- remove unused or duplicate fields
- fix reference handling
- tighten validation

### Phase 3: Auth and user attribution

- make active logged-in user explicit
- stop relying on `LIMIT 1` user lookup
- fix session restore behavior

### Phase 4: Sync cleanup

- choose QR-first, API-first, or hybrid-with-clear-rules
- unify sync status sources
- harden conflict behavior

### Phase 5: UI polish

- dashboard spacing and hierarchy
- history list readability
- form ergonomics
- better Android-safe interactions

## Short Honest Status Summary

You can describe the current project like this:

> The system already has a strong offline-first foundation, transaction-based accounting logic, and usable mobile screens. The main work left is not inventing the system from zero. The main work is cleaning up duplicate flows, hardening auth and sync behavior, and polishing the mobile UX screen by screen.

## What To Tell Future Codex Sessions

When continuing this project, tell Codex:

- do not rewrite the business model
- preserve transaction-based balance calculation
- prioritize mobile UX and offline behavior
- improve one screen or one bug group at a time
- avoid broad refactors unless they clearly simplify duplicate flows
