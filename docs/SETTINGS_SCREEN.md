# SettingsScreen Component Documentation

## Overview

Comprehensive settings screen for JCash Mobile app with full offline-first capabilities.

## Location

- **Component**: `src/screens/SettingsScreen.tsx`
- **Route**: `app/settings.tsx`
- **Access**: Home screen settings button (⚙️) or navigate to `/settings`

## Features Implemented

### 1. Account Information Section

- **User Avatar**: Displays first letter of user name in colored circle
- **User Details**: Shows name, email, and role
- **Change Password**: Button to request password change (requires server implementation)

### 2. Server Configuration

- **Server URL Configuration**
  - View current server URL
  - Update server URL via prompt dialog
  - Saves to AsyncStorage and applies immediately
  - Not available on web platform

- **Test Connection**
  - Check internet connectivity
  - Display server URL
  - Show last sync time
  - Display unsynced items count

### 3. Sync Settings

#### Auto-Sync Toggle

- Enable/disable automatic synchronization
- Persists setting to AsyncStorage with key: `settings_auto_sync`
- Sets up auto-sync listener when enabled
- Shows confirmation alert on toggle

#### Force Full Sync

- Manually trigger complete data synchronization
- Checks internet connection before syncing
- Shows loading indicator during sync
- Displays last sync time
- Handles sync errors with detailed messages
- Disabled while sync is in progress

#### Clear All Local Data

- **DANGER**: Permanently deletes all local data
- Confirmation dialog with destructive action
- Drops all database tables
- Reinitializes empty database
- Clears AsyncStorage (except auth token)
- Automatically logs out user after clearing
- Not available on web platform

### 4. Database Actions

#### View Database Stats

- Displays record counts for all tables:
  - Users
  - Transactions
  - GCash Accounts
  - Cash Wallet Records
  - Daily Sessions
- Shows total record count
- Expandable stats card
- Loading indicator while fetching
- Not available on web platform

#### Export Data (Optional)

- Export all local data as JSON
- Includes metadata (export date, app version)
- Exports all tables data
- Uses Share API to save/send data
- Useful for backup and debugging
- Not available on web platform

### 5. About Section

Displays comprehensive app information:

- App name: "JCash Mobile"
- Version: "1.0.0"
- Build number: "20260129"
- Platform: Current OS (android/ios/web)
- Description: App purpose and features
- Developer info: "JCash Team"
- Support email: "support@jcash.com"

### 6. Logout

- Confirmation dialog before logout
- Destructive action styling (red)
- Clears auth state from stores
- Redirects to login screen
- Uses `router.replace()` to prevent back navigation

## AsyncStorage Keys

The component uses AsyncStorage to persist settings:

```typescript
const SETTINGS_KEYS = {
  AUTO_SYNC: "settings_auto_sync", // boolean as string
  SYNC_INTERVAL: "settings_sync_interval", // future use
};
```

## State Management

### Local State

- `autoSync`: boolean - Auto-sync enabled/disabled
- `isLoadingStats`: boolean - Loading database statistics
- `dbStats`: DatabaseStats | null - Cached database counts
- `showStats`: boolean - Toggle stats card visibility

### Zustand Stores

- `useAuthStore`: User info, logout function
- `useSyncStore`: Sync state, last sync time, unsynced count

## Platform-Specific Features

### iOS/Android Only:

- Server URL configuration
- Clear all local data
- View database stats
- Export data
- Database operations

### All Platforms:

- Account info display
- Test connection
- Auto-sync toggle
- Force full sync
- About section
- Logout

## UI Components

### Header

- Back button (←) - Navigate back
- Title: "Settings"
- Centered layout

### Card Sections

All major sections use white cards with:

- Shadow elevation
- Rounded corners (12px)
- Proper padding
- Section titles in uppercase

### Action Items

- Icon + Text layout
- Right arrow indicator (›)
- Subtle shadows
- Touch feedback

### Danger Actions

- Red border on left side
- Red text color
- Destructive confirmation dialogs

## Navigation

```typescript
import { useRouter } from "expo-router";

const router = useRouter();

// Navigate to settings
router.push("/settings");

// Go back
router.back();

// After logout
router.replace("/(auth)/login");
```

## Error Handling

All async operations include try-catch blocks with:

- Console error logging
- User-friendly alert messages
- Graceful degradation for web platform
- Loading states during operations

## Styling

### Design System

- **Primary Color**: #007AFF (iOS Blue)
- **Danger Color**: #ff3b30 (iOS Red)
- **Success Color**: #34C759 (iOS Green)
- **Background**: #f5f5f5 (Light Gray)
- **Card Background**: #fff (White)
- **Text Primary**: #1a1a1a (Almost Black)
- **Text Secondary**: #666 (Gray)
- **Text Tertiary**: #999 (Light Gray)

### Typography

- Section titles: 14px, uppercase, 600 weight
- Item text: 16px, 500 weight
- Subtitles: 12-14px, regular
- User name: 18px, 600 weight

## Dependencies

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseURL, updateBaseURL } from "@/src/api/client";
import { db, dropAllTables, initDatabase } from "@/src/database/sqlite";
import { useAuthStore } from "@/src/store/authStore";
import { useSyncStore } from "@/src/store/syncStore";
import * as SyncManager from "@/src/utils/syncManager";
import { useRouter } from "expo-router";
import { Platform, Alert, Share } from "react-native";
```

## Usage Example

```typescript
// From any screen
import { useRouter } from 'expo-router';

function MyScreen() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push('/settings')}>
      <Text>Open Settings</Text>
    </TouchableOpacity>
  );
}
```

## Future Enhancements

Potential additions:

1. ✅ Auto-sync toggle - IMPLEMENTED
2. ✅ Sync interval configuration - UI ready, needs implementation
3. ⏳ Change password with API integration
4. ⏳ Theme selection (light/dark mode)
5. ⏳ Language selection
6. ⏳ Notification preferences
7. ⏳ Biometric authentication toggle
8. ⏳ Data usage statistics
9. ⏳ Import data from JSON
10. ⏳ Cloud backup integration

## Testing Checklist

- [ ] Load settings screen
- [ ] View user information correctly
- [ ] Change server URL (non-web)
- [ ] Test connection shows status
- [ ] Toggle auto-sync on/off
- [ ] Force full sync works
- [ ] View database stats (non-web)
- [ ] Export data works (non-web)
- [ ] Clear data confirms and works (non-web)
- [ ] About section displays correctly
- [ ] Logout confirms and redirects
- [ ] Settings persist after app restart
- [ ] Back button navigation works
- [ ] All alerts display properly
- [ ] Loading states show correctly

## Common Issues & Solutions

### Issue: Settings not persisting

**Solution**: Check AsyncStorage permissions and keys are correct

### Issue: Auto-sync not working

**Solution**: Verify SyncManager.setupAutoSync is called with callback

### Issue: Database stats not loading

**Solution**: Check Platform.OS !== 'web' and database is initialized

### Issue: Server URL not updating

**Solution**: Ensure updateBaseURL is called and AsyncStorage saves

### Issue: Clear data not working

**Solution**: Verify dropAllTables and initDatabase are called properly

## Performance Notes

- Database stats query may take time with large datasets
- Export data generates large JSON for many records
- Clear data operation is synchronous and blocks UI briefly
- All settings operations are optimized with loading states

## Accessibility

- All touchable elements have proper hit areas (minimum 44x44)
- Text contrasts meet WCAG standards
- Icons supplement text labels
- Confirmation dialogs for destructive actions
- Clear visual feedback for toggle switches
- Loading indicators for async operations
