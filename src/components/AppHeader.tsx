import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import TYPOGRAPHY from '../../constants/typography';
import { useAuthStore } from '../store/authStore';

export default function AppHeader() {
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerLeft}>
                <Image
                    source={require('../../assets/images/maskable-icon-512x512.png')}
                    style={styles.logo}
                />
                <Text style={styles.appTitle}>
                    <Text style={{ color: COLORS.primary }}>J</Text>
                    <Text style={{ color: COLORS.textPrimary }}>Cash</Text>
                </Text>
            </View>
            <View style={styles.headerRight}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userRole}>{user?.role || 'staff'}</Text>
                </View>
                <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 34,
        height: 34,
        borderRadius: 10,
    },
    appTitle: {
        fontSize: 20,
        fontFamily: TYPOGRAPHY.bold,
        letterSpacing: -0.3,
    },
    userInfo: {
        alignItems: 'flex-end',
    },
    userName: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    userRole: {
        fontSize: 11,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textTertiary,
        textTransform: 'capitalize',
    },
    userAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.bold,
        color: COLORS.white,
    },
});
