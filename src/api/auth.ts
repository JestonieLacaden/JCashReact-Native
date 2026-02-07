import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient, { isOfflineError } from "./client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Login user with email and password
 * @param email - User email
 * @param password - User password
 * @returns Promise with token and user data
 */
export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>("/login", {
      email,
      password,
    });

    // Store token in AsyncStorage
    if (response.data.token) {
      await AsyncStorage.setItem("auth_token", response.data.token);
      await AsyncStorage.setItem(
        "user_data",
        JSON.stringify(response.data.user),
      );
      console.log("[Auth] Login successful, token stored");
    }

    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      throw new Error("Unable to login: No internet connection");
    }

    if (error.response?.status === 401) {
      throw new Error("Invalid email or password");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Login failed. Please try again.");
  }
};

/**
 * Logout current user
 * Clears token and calls server to invalidate session
 */
export const logout = async (): Promise<void> => {
  try {
    // Try to call logout endpoint (server will invalidate token)
    await apiClient.post("/logout");
    console.log("[Auth] Server logout successful");
  } catch (error: any) {
    // Even if server logout fails, we still clear local data
    console.warn(
      "[Auth] Server logout failed, clearing local data anyway:",
      error.message,
    );
  } finally {
    // Always clear local authentication data
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user_data");
    console.log("[Auth] Local auth data cleared");
  }
};

/**
 * Get current authenticated user data
 * @returns Promise with user data
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await apiClient.get<User>("/user");

    // Update stored user data
    await AsyncStorage.setItem("user_data", JSON.stringify(response.data));

    return response.data;
  } catch (error: any) {
    if (isOfflineError(error)) {
      // If offline, try to return cached user data
      const cachedUser = await AsyncStorage.getItem("user_data");
      if (cachedUser) {
        console.log("[Auth] Offline - returning cached user data");
        return JSON.parse(cachedUser);
      }
      throw new Error("Unable to get user data: No internet connection");
    }

    if (error.response?.status === 401) {
      // Token is invalid
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");
      throw new Error("Authentication expired. Please login again.");
    }

    throw new Error("Failed to get user data");
  }
};

/**
 * Get stored user data from AsyncStorage (no API call)
 * @returns User data or null if not found
 */
export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("[Auth] Error reading stored user:", error);
    return null;
  }
};

/**
 * Get stored auth token from AsyncStorage (no API call)
 * @returns Token string or null if not found
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("auth_token");
  } catch (error) {
    console.error("[Auth] Error reading stored token:", error);
    return null;
  }
};

/**
 * Check if user is authenticated (has valid token)
 * @returns boolean indicating if user has a stored token
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getStoredToken();
  return !!token;
};
