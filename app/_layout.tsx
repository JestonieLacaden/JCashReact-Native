import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useNavigationContainerRef, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/src/database/database';
import { useAuthStore } from '@/src/store/authStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loadUser, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize database and load user on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[RootLayout] Initializing database...');
        initializeDatabase();
        console.log('[RootLayout] Loading user...');
        await loadUser();
        console.log('[RootLayout] Initialization complete');
        setIsInitialized(true);
      } catch (error) {
        console.error('[RootLayout] Error initializing app:', error);
        setIsInitialized(true); // Set true even on error to allow navigation
      }
    };
    init();
  }, []);

  // Wait for navigation to be ready
  useEffect(() => {
    if (navigationRef?.current) {
      setIsNavigationReady(true);
    }

    const unsubscribe = navigationRef?.addListener?.('state', () => {
      setIsNavigationReady(true);
    });

    // Set ready after a delay as fallback
    const timer = setTimeout(() => {
      console.log('[RootLayout] Navigation ready timeout triggered');
      setIsNavigationReady(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [navigationRef]);

  // Handle authentication routing - only when ready
  useEffect(() => {
    if (!isNavigationReady || !isInitialized || isLoading) {
      console.log('[RootLayout] Waiting...', { isNavigationReady, isInitialized, isLoading });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    console.log('[RootLayout] Routing check:', { isAuthenticated, inAuthGroup, segments });

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RootLayout] Redirecting to login...');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[RootLayout] Redirecting to home...');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isNavigationReady, isInitialized, isLoading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transactions"
          options={{
            headerShown: true,
            title: 'Transactions',
            presentation: 'card'
          }}
        />
        <Stack.Screen
          name="cash-in"
          options={{
            headerShown: false,
            title: 'Cash In',
            presentation: 'card'
          }}
        />
        <Stack.Screen
          name="cash-out"
          options={{
            headerShown: false,
            title: 'Cash Out',
            presentation: 'card'
          }}
        />

        <Stack.Screen
          name="transfer"
          options={{
            headerShown: true,
            title: 'Transfer',
            presentation: 'card'
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings',
            presentation: 'card'
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
