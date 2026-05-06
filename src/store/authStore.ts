import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { create } from "zustand";
import { db } from "../database/database";

export interface User {
  id?: number | string;
  name: string;
  email: string;
  role: string;
  token: string;
  photoURL?: string | null;
}

const canUseNativeFirebase =
  Platform.OS !== "web" && Constants.appOwnership !== "expo";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Login user with email and password
   * Checks against local SQLite database (OFFLINE-FIRST)
   */
  login: async (emailOrUsername: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      if (Platform.OS === "web") {
        throw new Error("Web platform not supported for offline-first mode");
      }

      // Query local SQLite database - check both email AND username
      const rows: any[] = db.getAllSync(
        "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1;",
        [emailOrUsername, emailOrUsername],
      );

      if (rows.length === 0) {
        throw new Error("Invalid email or password");
      }

      const dbUser = rows[0];

      // In offline-first mode, we use simple password check
      // For production, you should use proper password hashing
      if (dbUser.password !== password) {
        throw new Error("Invalid email or password");
      }

      const user: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        token: `local_${Date.now()}`, // Generate local token
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem("auth_token", user.token);
      await AsyncStorage.setItem("user_data", JSON.stringify(user));

      // Update last login time
      db.runSync(
        "UPDATE users SET updated_at = datetime('now') WHERE id = ?;",
        [user.id],
      );

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log("[AuthStore] Login successful (offline mode)");
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      console.error("[AuthStore] Login error:", errorMessage);
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });

    try {
      if (!canUseNativeFirebase) {
        throw new Error(
          "Google sign-in requires an Android development build. Run npm run android instead of Expo Go.",
        );
      }

      const { signInWithGoogle } = await import("../services/firebaseAuth");
      const user = await signInWithGoogle();

      if (!user) {
        set({ isLoading: false });
        return;
      }

      await AsyncStorage.setItem("auth_token", user.token);
      await AsyncStorage.setItem("user_data", JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log("[AuthStore] Google login successful");
    } catch (error: any) {
      const errorMessage = error.message || "Google login failed";
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      console.error("[AuthStore] Google login error:", errorMessage);
      throw error;
    }
  },

  /**
   * Logout user
   * Clears token and AsyncStorage (OFFLINE-FIRST)
   */
  logout: async () => {
    set({ isLoading: true });

    try {
      if (canUseNativeFirebase) {
        const { signOutFromFirebase } = await import("../services/firebaseAuth");
        await signOutFromFirebase();
      }

      // Clear from AsyncStorage
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      console.log("[AuthStore] Logout successful (offline mode)");
    } catch (error: any) {
      console.error("[AuthStore] Logout error:", error);
      // Even if clearing fails, reset state
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  /**
   * Load user from AsyncStorage on app start
   * Falls back to SQLite if AsyncStorage fails
   */
  loadUser: async () => {
    set({ isLoading: true });

    try {
      // Try to load from AsyncStorage first
      const token = await AsyncStorage.getItem("auth_token");
      const userData = await AsyncStorage.getItem("user_data");

      if (token && userData) {
        const user: User = JSON.parse(userData);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log("[AuthStore] User loaded from AsyncStorage");
        return;
      }

      if (canUseNativeFirebase) {
        const { getCurrentFirebaseUser } = await import("../services/firebaseAuth");
        const firebaseUser = await getCurrentFirebaseUser();
        if (firebaseUser) {
          await AsyncStorage.setItem("auth_token", firebaseUser.token);
          await AsyncStorage.setItem("user_data", JSON.stringify(firebaseUser));

          set({
            user: firebaseUser,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log("[AuthStore] User loaded from Firebase auth");
          return;
        }
      }

      // Fallback to SQLite if available
      if (Platform.OS !== "web") {
        try {
          const rows = db.getAllSync("SELECT * FROM users LIMIT 1;");

          if (rows.length > 0) {
            const dbUser = rows[0];
            const user: User = {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              token: dbUser.token,
            };

            // Restore to AsyncStorage
            await AsyncStorage.setItem("auth_token", user.token);
            await AsyncStorage.setItem("user_data", JSON.stringify(user));

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            console.log("[AuthStore] User loaded from SQLite");
          } else {
            set({ isLoading: false });
            console.log("[AuthStore] No user found");
          }
        } catch (error) {
          console.error("[AuthStore] Error loading user from SQLite:", error);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
        console.log("[AuthStore] No user found");
      }
    } catch (error) {
      console.error("[AuthStore] Error loading user:", error);
      set({ isLoading: false });
    }
  },

  /**
   * Set user manually (useful for updates)
   */
  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
