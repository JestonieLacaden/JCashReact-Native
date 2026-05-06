import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import COLORS from '@/constants/colors';
import { CenterTabButton, TransactionSheet } from '@/src/components/FloatingActionButton';
import { useAuthStore } from '@/src/store/authStore';

export default function TabLayout() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const insets = useSafeAreaInsets();
  const [showTransactionSheet, setShowTransactionSheet] = useState(false);

  // Bottom padding: use safe area inset for gesture nav, or a minimum for button nav
  const bottomPadding = Math.max(insets.bottom, 4);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textTertiary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: bottomPadding + 4,
            height: 60 + bottomPadding,
            ...Platform.select({
              ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: -2,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        {/* Center Transaction Button */}
        <Tabs.Screen
          name="new-transaction"
          options={{
            title: '',
            tabBarButton: () => (
              <CenterTabButton onPress={() => setShowTransactionSheet(true)} />
            ),
          }}
        />
        <Tabs.Screen
          name="funds"
          options={{
            title: 'Funds',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={22}
                color={color}
              />
            ),
            href: isAdmin ? '/funds' : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={22}
                color={color}
              />
            ),
            href: isAdmin ? '/settings' : null,
          }}
        />
      </Tabs>

      {/* Transaction Bottom Sheet */}
      <TransactionSheet
        visible={showTransactionSheet}
        onClose={() => setShowTransactionSheet(false)}
      />
    </>
  );
}
