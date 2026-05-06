# JCash Mobile Codex Handoff

## Why This File Exists

This file is meant to be given to Codex or another AI coding assistant so it can quickly understand the project without re-deriving the whole system from scratch.

## One-Sentence Project Summary

JCash Mobile is an offline-first React Native app for recording GCash business transactions on mobile, with local history, computed balances, and later sync through HTTP or QR.

## Product Goal

The project started from a Laravel + Vue system, but the real target now is mobile.

The app should help the operator:

- record transactions on phone
- work even without internet
- keep business history separate from the official GCash app
- reduce or remove paper-based manual logs

## What The App Must Do

Core requirements:

1. Record cash in transactions
2. Record cash out transactions
3. Keep searchable/filterable history
4. Compute balances from transaction history
5. Support multiple business GCash accounts
6. Work offline first
7. Sync later when possible

## Business Rules

### 1. Transactions Are The Source Of Truth

Do not treat stored balances as the main truth.

Balances must be computed from:

- starting balances
- completed transactions

Main file:

- `src/services/BalanceCalculator.ts`

### 2. Main Transaction Types

- `cash_in`
- `cash_out`
- `capital_move`
- `adjustment`

### 3. Fee Rules

Current tier logic:

- below 500 = 5
- 500 to 999 = 10
- 1000 and above = 15 per 1000
- discounted = 10 per 1000

Main file:

- `src/services/FeeService.ts`

### 4. Roles

- `admin`
- `staff`

Admin has access to more functions such as funds management and some sync actions.

## Current Architecture

### UI / Routing

- `app/`
- `src/screens/`
- `src/components/`

The app uses Expo Router.

Important layout files:

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`

### Local Database

- `src/database/database.ts`

SQLite schema includes:

- users
- transactions
- gcash_accounts
- starting_balances
- sync_log
- device_info
- fee_settings

### State

- `src/store/authStore.ts`
- `src/store/transactionStore.ts`
- `src/store/syncStore.ts`

### Services

- `src/services/TransactionService.ts`
- `src/services/BalanceCalculator.ts`
- `src/services/FeeService.ts`
- `src/services/GcashAccountService.ts`
- `src/services/DeviceService.ts`
- `src/services/QRSyncService.ts`

### HTTP Sync/API

- `src/api/client.ts`
- `src/api/sync.ts`
- `src/utils/syncManager.ts`

## Main Screens

### Login

- `src/screens/LoginScreen.tsx`

Uses local auth flow through Zustand + AsyncStorage + SQLite.

### Home

- `src/screens/HomeScreen.tsx`

Shows:

- total GCash
- cash on hand
- total capital
- tubo today
- sync status

### New Transaction

- `src/screens/NewTransactionScreen.tsx`

Main mobile transaction entry screen.

### History

- `src/screens/HistoryScreen.tsx`

Main record/history screen with:

- filters
- search
- details modal
- earnings summary
- CSV export

### Funds

- `src/screens/FundsScreen.tsx`

Admin management for:

- balance adjustment
- capital movement

### Settings

- `src/screens/SettingsScreen.tsx`

Contains:

- account info
- server URL
- sync actions
- export/debug utilities
- logout

### Sync / QR

- `src/screens/SyncScreen.tsx`
- `src/screens/QRGeneratorScreen.tsx`
- `src/screens/QRScannerScreen.tsx`

## How Sync Currently Works

There are two sync paths in the codebase:

### Path A: HTTP Sync

Used for backend/Laravel API sync.

Relevant files:

- `src/api/sync.ts`
- `src/utils/syncManager.ts`
- `src/store/syncStore.ts`

### Path B: QR Sync

Used for device-to-device exchange.

Relevant files:

- `src/services/QRSyncService.ts`
- `src/screens/SyncScreen.tsx`
- `src/screens/QRGeneratorScreen.tsx`
- `src/screens/QRScannerScreen.tsx`

If the product priority is strict offline mobile usage, QR sync is closer to the project vision than backend-dependent sync.

## Current Technical Direction Codex Should Respect

When editing this project, keep these priorities:

1. Mobile-first UX
2. Offline-first behavior
3. Transaction history reliability
4. Simple, clear cashier workflow
5. Minimal typing during transaction entry
6. Safe sync behavior
7. Preserve transaction-based accounting model

## Important Constraints

### Do not redesign the business model around stored balances

That would fight the current architecture and create sync problems.

### Keep forms fast

This app is for real transaction handling, not back-office desktop data entry.

### Prefer practical UI over decorative UI

This system is operational. Clarity and speed matter more than visual effects.

### Treat the project as a migration from web mindset to mobile mindset

Some parts still look like web forms translated into mobile. That is expected technical debt.

## Good Next Tasks For Codex

If another Codex continues this project, good next tasks are:

1. Unify duplicated transaction-entry screens into one mobile-first flow
2. Clean up auth flow so active user is explicit and reliable
3. Standardize sync strategy and choose primary sync path
4. Improve history performance and detail views
5. Fix account, reference, and validation inconsistencies
6. Improve Android-safe settings interactions
7. Polish mobile UI screen by screen

## Definition Of Success

The app is successful when:

- a user can record transactions quickly on mobile
- records are trustworthy even offline
- balances remain consistent because they are derived from transactions
- history is easy to review
- syncing does not destroy data integrity

## Short Prompt You Can Give To Another Codex

Use this prompt:

> This repo is JCash Mobile, an offline-first React Native app for recording GCash business transactions on mobile. The business uses it as a replacement for paper records and as an internal history separate from the official GCash app. The architecture is transaction-first: balances must be computed from transactions and starting balances, not stored as primary truth. Main flows are login, dashboard, cash in, cash out, history, admin funds management, and QR/API sync. Please preserve the offline-first design and improve the mobile UX and bugs incrementally.

## If More Backend Context Is Needed

If a future Codex needs full Laravel behavior, provide:

- Laravel repo
- API routes
- sync endpoint contract
- old Vue screen references
- real production business rules

This React Native repo alone explains the mobile side, but not every backend detail from the old system.
