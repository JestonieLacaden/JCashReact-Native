# JCash Mobile System Overview

## Purpose

JCash Mobile is an offline-first mobile app for recording GCash-related transactions.

The main goal is not to replace the official GCash app. The goal is to give the operator a dedicated business record system for:

- cash in
- cash out
- capital movement
- manual balance adjustment
- transaction history
- offline sync between devices

This solves the paper-based recording problem. Instead of writing transactions on paper and relying only on the GCash app history, this app keeps a structured transaction log that belongs to the business.

## Project Direction

Based on the current codebase and your explanation, the system direction is:

1. Old system: Laravel + Vue web app
2. Current transition: React Native mobile app
3. Main target: mobile-first workflow
4. Core requirement: offline transaction recording
5. Secondary requirement: sync data later when devices reconnect or exchange data

So the real product direction is:

"A mobile offline transaction recorder for GCash operations, with its own history, balances, and sync flow."

## Core Business Idea

The app is for a small GCash operation where the operator handles customer transactions manually in real life, but wants clean digital records.

Example use:

- Customer wants cash in
- Operator receives cash
- Operator sends equivalent value to customer via GCash
- App records the transaction, fee, account used, date, and reference

Another example:

- Customer wants cash out
- Customer sends GCash
- Operator gives cash
- App records the payout, fee, receiver info, and account used

The app therefore acts like:

- cashier record book
- transaction ledger
- balance tracker
- syncable offline business tool

## Technical Stack

Current mobile stack in this repo:

- React Native
- Expo
- Expo Router
- TypeScript
- SQLite via `expo-sqlite`
- Zustand for state management
- AsyncStorage for local session/settings storage
- Axios for HTTP sync to Laravel API
- QR-based sync using compressed payloads

## High-Level Architecture

The current app follows this structure:

### 1. UI Layer

Files under:

- `app/`
- `src/screens/`
- `src/components/`

This layer handles screens, forms, tabs, headers, modals, filters, and QR UI.

### 2. Local Data Layer

Files under:

- `src/database/`
- `src/services/`

This layer stores and computes business data locally on the device.

### 3. State Layer

Files under:

- `src/store/`

This layer manages auth state, transaction state, and sync state.

### 4. Sync/API Layer

Files under:

- `src/api/`
- `src/utils/syncManager.ts`
- `src/services/QRSyncService.ts`

This layer handles:

- HTTP sync with Laravel backend
- QR export/import between devices

## Most Important System Rule

The most important rule in the codebase is:

"Transactions are the source of truth. Balances are calculated, not stored."

This is implemented in `src/services/BalanceCalculator.ts`.

Why this matters:

- safer for offline-first behavior
- easier to sync multiple devices
- less risk of balance mismatch
- every balance can be rebuilt from transaction history

So instead of saving "current balance" as the main truth, the app stores:

- starting balances
- all transactions after that

Then it computes:

- cash on hand
- each GCash account balance
- total capital
- daily profit

## Main Data Model

### Users

Stored in `users`

Used for:

- login
- role control
- audit trail

Roles:

- admin
- staff

### Transactions

Stored in `transactions`

Types:

- `cash_in`
- `cash_out`
- `capital_move`
- `adjustment`

Each transaction contains:

- unique id
- type
- account references
- amount
- fee
- discounted flag
- status
- reference
- remarks
- receiver/customer info
- created by user
- created by device
- sync status

### GCash Accounts

Stored in `gcash_accounts`

Used to represent the business-owned GCash numbers/accounts used in operations.

### Starting Balances

Stored in `starting_balances`

Used as the base for balance calculation.

### Fee Settings

Stored in `fee_settings`

The fee logic is tier-based.

### Device Info and Sync Log

Stored in:

- `device_info`
- `sync_log`

Used for:

- tracking devices
- sync history
- last seen / last sync metadata

## Fee Logic

Implemented in `src/services/FeeService.ts`.

Current fee tiers:

- below 500 = 5
- 500 to 999 = 10
- per 1000 regular = 15
- per 1000 discounted = 10

This is important because fee calculation is part of the business logic, not just UI.

## Main User Flows

### Login

- App initializes SQLite database
- App loads saved session from AsyncStorage
- User logs in locally
- App routes to tab layout after authentication

### Dashboard

Dashboard shows:

- total GCash
- cash on hand
- total capital
- tubo today
- sync status

These values are computed from local transactions.

### New Transaction

User chooses:

- Cash In
- Cash Out

Then enters transaction details such as:

- account
- amount
- fee
- customer info
- remarks

### History

History screen supports:

- list view of transactions
- search
- date filtering
- type filtering
- account filtering
- earnings summary
- CSV export

### Funds Management

Admin-only area for:

- balance adjustment
- capital movement

### Sync

There are currently two sync approaches in the code:

1. HTTP sync to Laravel API
2. QR sync between devices

For your offline target, QR sync is already aligned with the business idea because it can work device-to-device even when backend access is limited.

## Current Navigation

The app uses Expo Router with:

- auth group
- tab group
- extra stack screens

Main tabs:

- Home
- History
- New Transaction button in center
- Funds
- Settings

Extra screens:

- Sync
- QR Generator
- QR Scanner
- Cash In
- Cash Out
- Transactions
- Transfer

## Offline-First Behavior

The app already has the right offline-first foundation:

- local SQLite database
- local login/session state
- local transaction creation
- sync flags on transactions
- balance calculation from local history

This means the app can continue recording transactions even without internet.

That is the correct direction for your use case.

## What This App Is Really Becoming

In simple terms, this app is becoming:

"A mobile cashier and transaction ledger for GCash operations, built for offline use first, with optional sync later."

That is the clearest description you can give to another Codex or future developer.

## Recommended Product Statement

You can reuse this statement directly:

> JCash Mobile is an offline-first React Native app for small GCash operations. It records cash in, cash out, capital movement, and manual balance adjustments on mobile devices. It keeps its own transaction history, computes balances from recorded transactions, and supports sync later through backend API or QR/device exchange. The app is meant to replace paper-based records and reduce dependence on the GCash app history alone.

## Scope Of This Document

This document is based on:

- your stated Laravel + Vue origin
- the current React Native code in this repo

It documents the current mobile system direction, not the full old Laravel backend implementation.
