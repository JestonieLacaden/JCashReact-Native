import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack, useNavigationContainerRef, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/src/database/database';
import { useAuthStore } from '@/src/store/authStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore repeated calls during fast refresh.
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loadUser, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

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
        setIsInitialized(true);
      }
    };
    init();
  }, [loadUser]);

  useEffect(() => {
    if (navigationRef?.current) {
      setIsNavigationReady(true);
    }

    const unsubscribe = navigationRef?.addListener?.('state', () => {
      setIsNavigationReady(true);
    });

    const timer = setTimeout(() => {
      console.log('[RootLayout] Navigation ready timeout triggered');
      setIsNavigationReady(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [navigationRef]);

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
  }, [isAuthenticated, isInitialized, isLoading, isNavigationReady, router, segments]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore if already hidden.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
