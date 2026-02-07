/**
 * SYNC STATUS BAR COMPONENT
 * 
 * Shows sync status on all screens
 * Tappable to navigate to SyncScreen
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { QRSyncService } from '../services/QRSyncService';

interface SyncStatusBarProps {
    style?: any;
}

export default function SyncStatusBar({ style }: SyncStatusBarProps) {
    const router = useRouter();
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSyncStatus();

        // Refresh every 30 seconds
        const interval = setInterval(loadSyncStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSyncStatus = async () => {
        try {
            const stats = await QRSyncService.getSyncStats();
            setUnsyncedCount(stats.unsynced_count);
            setLastSyncTime(stats.last_sync_at);
        } catch (error) {
            console.error('Error loading sync status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = () => {
        if (unsyncedCount === 0) return COLORS.success;
        if (unsyncedCount < 10) return COLORS.warning;
        return COLORS.danger;
    };

    const getStatusText = () => {
        if (unsyncedCount === 0) return 'Synced';
        if (unsyncedCount === 1) return '1 pending';
        return `${unsyncedCount} pending`;
    };

    const formatLastSync = () => {
        if (!lastSyncTime) return 'Never synced';

        const date = new Date(lastSyncTime);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) return null;

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={() => router.push('/sync')}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <View style={styles.textContainer}>
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                    <Text style={styles.lastSyncText}>{formatLastSync()}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
            web: {
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
            },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    lastSyncText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    chevron: {
        fontSize: 20,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
});
