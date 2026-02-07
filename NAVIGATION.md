# JCash Mobile - Navigation Structure

This app uses **Expo Router** for file-based routing, not traditional React Navigation.

## Route Structure

```
app/
├── _layout.tsx              # Root layout with auth routing logic
├── (auth)/                  # Auth group (login flow)
│   ├── _layout.tsx          # Auth stack layout
│   └── login.tsx            # Login screen
├── (tabs)/                  # Main app tabs (authenticated users)
│   ├── _layout.tsx          # Tab bar layout
│   ├── index.tsx            # Home tab (HomeScreen)
│   └── explore.tsx          # Explore tab (placeholder)
├── transactions.tsx         # Transaction list screen
├── cash-in.tsx             # Cash in form screen
├── cash-out.tsx            # Cash out form screen
├── transfer.tsx            # Transfer screen (coming soon)
└── settings.tsx            # Settings screen
```

## Authentication Flow

The root layout (`app/_layout.tsx`) handles authentication routing:

1. **On App Start**:
   - Initializes SQLite database
   - Loads user from AsyncStorage or SQLite
   - Checks authentication status

2. **Routing Logic**:
   - If NOT authenticated → redirects to `/login`
   - If authenticated → redirects to `/(tabs)`

3. **Protected Routes**:
   - All routes outside of `(auth)` group require authentication
   - Auth state managed by Zustand store (`authStore`)

## Navigation Methods

### Using `router.push()`

Navigate to a new screen:

```typescript
import { useRouter } from "expo-router";

const router = useRouter();
router.push("/cash-in");
router.push("/transactions");
router.push("/settings");
```

### Using `router.replace()`

Replace current screen (no back button):

```typescript
router.replace("/(tabs)"); // After login
router.replace("/login"); // After logout
```

### Using `router.back()`

Go back to previous screen:

```typescript
router.back();
```

## Quick Actions Navigation

The HomeScreen has 4 quick action buttons:

1. **Cash In** → `/cash-in`
2. **Cash Out** → `/cash-out`
3. **Transfer** → `/transfer` (coming soon)
4. **View Txns** → `/transactions`

## Settings Access

Settings button (⚙️) in HomeScreen header navigates to `/settings`.

Settings screen includes:

- User profile information
- Server URL configuration
- Connection testing
- Clear cache
- Logout

## Tab Navigation

Main app tabs (defined in `app/(tabs)/_layout.tsx`):

1. **Home** - Dashboard with balances and quick actions
2. **Explore** - Placeholder for future features

## Screen Components

All screens are in `/src/screens/`:

- `LoginScreen.tsx` - Email/password authentication
- `HomeScreen.tsx` - Dashboard with balances, sync status
- `TransactionListScreen.tsx` - Transaction history with filters
- `CashInScreen.tsx` - Cash in form with GCash account selection
- `CashOutScreen.tsx` - Cash out form with receiver details

## Route Files

Route files in `/app/` are thin wrappers:

```typescript
// app/cash-in.tsx
import CashInScreen from "../src/screens/CashInScreen";
export default CashInScreen;
```

## Deep Linking

Expo Router automatically supports deep linking:

- `jcash://cash-in` → Opens cash in screen
- `jcash://transactions` → Opens transaction list
- `jcash://settings` → Opens settings

## Important Notes

1. **Do NOT use `react-navigation` imports** - Expo Router handles routing
2. **Always use `useRouter()` hook** - Not `useNavigation()`
3. **File names matter** - File structure defines routes
4. **Layouts control nesting** - `_layout.tsx` files define stack/tab structure
5. **Auth routing is automatic** - Handled in root `_layout.tsx`

## Testing Navigation

1. Start the app: `npm start` or `npx expo start`
2. Login with credentials
3. Test quick actions on home screen
4. Navigate through tabs
5. Test settings and logout
6. Verify redirect to login after logout

## Common Issues

### Issue: Navigation not working

- **Solution**: Make sure you're using `useRouter()` from `expo-router`, not `useNavigation()`

### Issue: Auth redirect loop

- **Solution**: Check `authStore.isAuthenticated` value and AsyncStorage token

### Issue: Screen not found

- **Solution**: Verify file exists in `/app/` directory with correct name

### Issue: Back button doesn't work

- **Solution**: Use `router.push()` instead of `router.replace()` for normal navigation

## Future Enhancements

1. Add tab bar to main app layout
2. Implement transfer screen
3. Add transaction details screen
4. Add profile edit screen
5. Add notification settings
