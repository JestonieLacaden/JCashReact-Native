import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// Configurable base URL - Laravel backend without /api prefix
const BASE_URL = "http://192.168.0.107:8000/api";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor - Add Bearer token to all requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
      );
      return config;
    } catch (error) {
      console.error("[API] Error reading token from storage:", error);
      return config;
    }
  },
  (error: AxiosError) => {
    console.error("[API] Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const { config, response } = error;

    // Log error details
    if (response) {
      console.error(
        `[API Error] ${response.status} ${config?.method?.toUpperCase()} ${config?.url}`,
        response.data,
      );

      // Handle 401 Unauthorized - logout user
      if (response.status === 401) {
        console.warn("[API] Unauthorized - clearing auth token");
        try {
          await AsyncStorage.removeItem("auth_token");
          await AsyncStorage.removeItem("user_data");
          // You can also trigger a navigation to login screen here
          // or use a global event emitter to notify the app
        } catch (storageError) {
          console.error("[API] Error clearing auth data:", storageError);
        }
      }
    } else if (error.request) {
      // Request was made but no response received (offline/network error)
      console.error(
        "[API Error] No response received - possibly offline:",
        error.message,
      );
    } else {
      // Something else happened
      console.error("[API Error] Request setup error:", error.message);
    }

    return Promise.reject(error);
  },
);

/**
 * Check if error is a network/offline error
 */
export const isOfflineError = (error: any): boolean => {
  return (
    !error.response &&
    (error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.message.includes("timeout"))
  );
};

/**
 * Update base URL configuration
 */
export const updateBaseURL = (newBaseURL: string) => {
  apiClient.defaults.baseURL = newBaseURL;
  console.log("[API] Base URL updated to:", newBaseURL);
};

/**
 * Get current base URL
 */
export const getBaseURL = (): string => {
  return apiClient.defaults.baseURL || BASE_URL;
};

export default apiClient;
