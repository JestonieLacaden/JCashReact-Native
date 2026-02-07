/**
 * SYNC SCREEN
 * 
 * Main screen for managing sync between devices
 * Shows sync status, generates QR codes, and scans QR codes
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { DeviceService } from '../services/DeviceService';
import { QRSyncService } from '../services/QRSyncService';
import { useAuthStore } from '../store/authStore';

export default function SyncScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    const [syncStats, setSyncStats] = useState({
        unsynced_count: 0,
        last_sync_at: null as string | null,
        total_syncs: 0,
    });
    const [deviceInfo, setDeviceInfo] = useState<any>(null);
    const [syncHistory, setSyncHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSyncData();
    }, []);

    const loadSyncData = async () => {
        setIsLoading(true);
        try {
            const stats = QRSyncService.getSyncStats();
            const device = await DeviceService.getDeviceInfo();
            const history = QRSyncService.getSyncHistory(5);

            setSyncStats(stats);
            setDeviceInfo(device);
            setSyncHistory(history);
        } catch (error) {
            console.error('Error loading sync data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateQR = () => {
        router.push('/qr-generator');
    };

    const handleScanQR = () => {
        router.push('/qr-scanner');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getSyncStatusColor = () => {
        if (syncStats.unsynced_count === 0) return COLORS.success;
        if (syncStats.unsynced_count < 10) return COLORS.warning;
        return COLORS.danger;
    };

    const getSyncStatusText = () => {
        if (syncStats.unsynced_count === 0) return 'All synced';
        if (syncStats.unsynced_count === 1) return '1 transaction pending';
        return `${syncStats.unsynced_count} transactions pending`;
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading sync data...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* App Header */}
            <View style={styles.appHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.appHeaderTitle}>Sync</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Sync Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={[styles.statusDot, { backgroundColor: getSyncStatusColor() }]} />
                        <Text style={styles.statusTitle}>{getSyncStatusText()}</Text>
                    </View>

                    <View style={styles.statusDetails}>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Last Sync:</Text>
                            <Text style={styles.statusValue}>{formatDate(syncStats.last_sync_at)}</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Total Syncs:</Text>
                            <Text style={styles.statusValue}>{syncStats.total_syncs}</Text>
                        </View>
                        {deviceInfo && (
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Device:</Text>
                                <Text style={styles.statusValue}>{deviceInfo.device_name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Sync Actions</Text>

                    {isAdmin && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.generateButton]}
                            onPress={handleGenerateQR}
                        >
                            <View style={styles.actionButtonIcon}>
                                <Text style={styles.actionButtonIconText}>📱</Text>
                            </View>
                            <View style={styles.actionButtonContent}>
                                <Text style={styles.actionButtonTitle}>Generate QR Code</Text>
                                <Text style={styles.actionButtonSubtitle}>
                                    Share data with other devices
                                </Text>
                            </View>
                            <Text style={styles.actionButtonArrow}>→</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.scanButton]}
                        onPress={handleScanQR}
                    >
                        <View style={styles.actionButtonIcon}>
                            <Text style={styles.actionButtonIconText}>📷</Text>
                        </View>
                        <View style={styles.actionButtonContent}>
                            <Text style={styles.actionButtonTitle}>Scan QR Code</Text>
                            <Text style={styles.actionButtonSubtitle}>
                                Receive data from another device
                            </Text>
                        </View>
                        <Text style={styles.actionButtonArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Sync History */}
                {syncHistory.length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>Recent Syncs</Text>

                        {syncHistory.map((sync, index) => (
                            <View key={index} style={styles.historyItem}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyMethod}>
                                        {sync.sync_method.toUpperCase()}
                                    </Text>
                                    <Text style={styles.historyDate}>
                                        {formatDate(sync.synced_at)}
                                    </Text>
                                </View>
                                <View style={styles.historyStats}>
                                    <Text style={styles.historyStat}>
                                        ↓ {sync.transactions_received} received
                                    </Text>
                                    <Text style={styles.historyStat}>
                                        ↑ {sync.transactions_sent} sent
                                    </Text>
                                    {sync.conflicts_resolved > 0 && (
                                        <Text style={[styles.historyStat, styles.historyConflict]}>
                                            ⚠ {sync.conflicts_resolved} conflicts
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>ℹ️ How Sync Works</Text>
                    <Text style={styles.infoText}>
                        • All changes are stored locally first{'\n'}
                        • Use QR codes to sync between devices{'\n'}
                        • Admin device is the source of truth{'\n'}
                        • Balances are calculated from transactions{'\n'}
                        • Works completely offline
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: COLORS.primary,
    },
    appHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    statusCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    statusDetails: {
        gap: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    actionsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    generateButton: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    scanButton: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    actionButtonIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionButtonIconText: {
        fontSize: 24,
    },
    actionButtonContent: {
        flex: 1,
    },
    actionButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    actionButtonSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    actionButtonArrow: {
        fontSize: 20,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
    historySection: {
        marginBottom: 24,
    },
    historyItem: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    historyMethod: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    historyDate: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    historyStats: {
        flexDirection: 'row',
        gap: 12,
    },
    historyStat: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    historyConflict: {
        color: COLORS.warning,
    },
    infoSection: {
        backgroundColor: COLORS.infoLight,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.info,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});
