import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../store/authStore';

export default function AppHeader() {
    const { user } = useAuthStore();

    return (
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
            <View style={styles.headerLeft}>
                <Image
                    source={require('../../assets/images/maskable-icon-512x512.png')}
                    style={styles.logo}
                />
                <Text style={styles.appTitle}>
                    <Text style={{ color: COLORS.primary }}>J</Text>Cash
                </Text>
            </View>
            <View style={styles.headerRight}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>👤</Text>
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
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    appTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    userName: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        color: COLORS.white,
    },
});
