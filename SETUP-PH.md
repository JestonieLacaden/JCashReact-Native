# JCash Mobile - Setup Guide (Tagalog)

## 📱 Paano I-setup ang JCash Mobile App

Ito ay isang **offline-first React Native app** gamit ang Expo para sa GCash transaction management.

---

## ✅ Pre-requisites (Kailangan mo muna)

1. **Node.js** - Version 18 o mas bago
   - Download: https://nodejs.org/
   - Check version: `node --version`

2. **npm** o **yarn** - Package manager
   - Kasama na sa Node.js installation
   - Check: `npm --version`

3. **Expo Go App** (Para sa mobile testing)
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

4. **Code Editor** (Optional pero recommended)
   - VS Code: https://code.visualstudio.com/

---

## 🚀 Step 1: I-install ang Dependencies

Pumunta sa project folder gamit ang terminal:

```bash
cd c:/Users/jesto/OneDrive/Documents/Web/ReactNative/jcash-mobile
```

I-install lahat ng packages:

```bash
npm install
```

**O kaya:**

```bash
npm install --legacy-peer-deps
```

⏳ Maghintay ng 2-5 minuto habang nag-install...

---

## 🎯 Step 2: I-start ang Development Server

Gamitin ang tamang command:

```bash
npx expo start
```

**HINDI ito:**

- ❌ `npm expo start` - Mali to!
- ✅ `npx expo start` - Tama!

### Makikita mo ang QR code at options:

```
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

---

## 📱 Step 3: I-open sa Phone (Expo Go)

### Para sa Android:

1. I-open ang **Expo Go** app
2. Scan ang QR code sa terminal
3. Wait lang, mag-load ang app

### Para sa iOS:

1. I-open ang **Camera** app
2. I-scan ang QR code
3. Tap ang notification
4. Bubukas sa Expo Go

### Para sa Web Browser:

- Press `w` sa terminal
- O kaya i-open: http://localhost:8081

---

## 🔧 Step 4: I-configure ang Backend API

### Option 1: I-set ang Server URL sa App

1. I-run ang app
2. Mag-login (kahit fake credentials lang)
3. Pumunta sa **Settings** (gear icon ⚙️)
4. Tap **Server URL**
5. I-enter ang API endpoint:
   ```
   http://your-server-ip:port/api
   ```
   Example: `http://192.168.1.100:3000/api`

### Option 2: I-edit ang Source Code

I-edit ang `src/api/client.ts`:

```typescript
const BASE_URL = "http://192.168.1.100:3000/api"; // I-change mo dito
```

---

## 🗄️ Database Setup (Automatic)

Ang SQLite database ay **automatic na ginagawa** pag first run:

```
Tables na ginagawa:
- users (user accounts)
- transactions (cash in/out records)
- gcash_accounts (GCash account list)
- cash_wallet (physical cash balance)
- daily_sessions (daily summaries)
```

Walang manual database setup na kailangan! 🎉

---

## 👤 Step 5: Testing - Login Screen

Pag nag-load na ang app, makikita mo ang **Login Screen**.

### Test Credentials:

**Development Mode** (kung walang backend server):

```
Email: test@example.com
Password: password123
```

**Production Mode** (kung may backend server na):

- Gumamit ng valid credentials from your server
- API endpoint: `POST /api/auth/login`

---

## 📂 Project Structure

```
jcash-mobile/
├── app/                      # Routes (Expo Router)
│   ├── (auth)/              # Login screens
│   ├── (tabs)/              # Main app tabs
│   ├── settings.tsx         # Settings screen
│   ├── transactions.tsx     # Transaction list
│   ├── cash-in.tsx          # Cash in screen
│   └── cash-out.tsx         # Cash out screen
│
├── src/
│   ├── api/                 # API services
│   │   ├── client.ts        # Axios config
│   │   ├── auth.ts          # Auth endpoints
│   │   └── sync.ts          # Sync endpoints
│   │
│   ├── database/            # SQLite setup
│   │   └── sqlite.ts        # Database schema
│   │
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ...
│   │
│   ├── store/               # Zustand state management
│   │   ├── authStore.ts
│   │   ├── syncStore.ts
│   │   └── transactionStore.ts
│   │
│   └── utils/
│       └── syncManager.ts   # Sync utility
│
├── package.json
└── tsconfig.json
```

---

## 🎮 Paano Gamitin ang App

### 1. Home Screen

- View cash balance at GCash balance
- Quick actions: Cash In, Cash Out, Transfer
- Sync status indicator
- Settings button

### 2. Cash In

- Select GCash account
- Enter amount
- May automatic fee calculation
- Saved offline, sync later

### 3. Cash Out

- Enter amount at receiver name
- Automatic fee calculation
- Saves to local database

### 4. Transactions List

- View all transactions
- Search at filter
- Pull-to-refresh
- Offline access

### 5. Settings

- Change server URL
- View database stats
- Auto-sync toggle
- Clear local data
- Export data
- Logout

---

## 🔄 Offline-First Features

Ang app ay **fully functional offline**:

✅ Login (cached credentials)
✅ View balances
✅ Create transactions
✅ View transaction history
✅ All CRUD operations

📡 Pag nag-online:

- Auto-sync ng unsynced data
- Pull latest data from server
- Background sync

---

## 🐛 Common Issues & Solutions

### Issue 1: "npm expo start" - Command not found

**Solution:** Gamitin `npx expo start` instead

### Issue 2: QR code hindi nag-scan

**Solution:**

- Check kung same WiFi ang phone at computer
- Try web version: Press `w`
- Check firewall settings

### Issue 3: "Unable to resolve module"

**Solution:**

```bash
npm install
npx expo start --clear
```

### Issue 4: Database errors

**Solution:**

```bash
# I-clear ang cache
npx expo start --clear

# O kaya i-reset ang app data sa Expo Go
```

### Issue 5: Network errors sa API

**Solution:**

- Check server URL sa Settings
- Gamitin ang **actual IP address**, hindi `localhost`
- Android: `http://10.0.2.2:3000/api` para sa emulator
- iOS/Physical: `http://192.168.x.x:3000/api`

### Issue 6: TypeScript errors

**Solution:**

```bash
npm install --save-dev @types/react@~19.1.0
npx expo start
```

---

## 🔌 Backend API Requirements

Kung mag-setup ka ng backend server, kailangan ng endpoints:

### Auth Endpoints:

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Sync Endpoints:

```
POST /api/sync/transactions
GET  /api/sync/transactions
POST /api/sync/all
GET  /api/sync/status
```

### Response Format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

---

## 📱 Testing sa Different Devices

### Android Emulator:

```bash
npx expo start --android
```

### iOS Simulator (Mac only):

```bash
npx expo start --ios
```

### Web Browser:

```bash
npx expo start --web
```

### Physical Device:

1. Install Expo Go app
2. Scan QR code
3. Make sure same network

---

## 🚀 Build for Production (Optional)

### Android APK:

```bash
eas build --platform android
```

### iOS IPA:

```bash
eas build --platform ios
```

**Note:** Kailangan ng EAS Account at configuration

---

## 📚 Documentation

Basahin ang mga files na ito para sa more details:

- [NAVIGATION.md](NAVIGATION.md) - Navigation structure
- [SETTINGS_SCREEN.md](docs/SETTINGS_SCREEN.md) - Settings features
- [README.md](README.md) - Original Expo docs

---

## 🆘 Need Help?

### Check Logs:

```bash
npx expo start
# Tignan ang terminal output para sa errors
```

### Debug Mode:

Press `j` sa terminal para mag-open ng debugger

### Clear Everything:

```bash
# Clear Expo cache
npx expo start --clear

# Clear node modules
rm -rf node_modules
npm install

# Clear watchman (Mac/Linux)
watchman watch-del-all
```

---

## ✅ Quick Start Checklist

- [ ] Node.js installed (v18+)
- [ ] npm install completed
- [ ] Expo Go app installed sa phone
- [ ] Same WiFi ang phone at computer
- [ ] `npx expo start` running
- [ ] QR code scanned
- [ ] App loaded sa phone
- [ ] Login screen visible
- [ ] Test login successful
- [ ] Home screen shows balances
- [ ] Settings accessible

---

## 🎉 Success!

Pag nakita mo na ang app sa phone mo, **success na!** 🎊

Pwede mo na i-test lahat ng features:

1. Login
2. View balances
3. Cash In/Out
4. View transactions
5. Sync data
6. Settings configuration

---

## 📞 Support

Para sa questions o issues:

- Check documentation files
- Review terminal errors
- Test sa web version first
- Ensure backend API is running

**Happy coding!** 💻📱
