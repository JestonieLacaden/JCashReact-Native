import { getBaseURL, updateBaseURL } from '@/src/api/client';
import { db, initializeDatabase, resetDatabase } from '@/src/database/database';
import { useAuthStore } from '@/src/store/authStore';
import { useSyncStore } from '@/src/store/syncStore';
import * as SyncManager from '@/src/utils/syncManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Settings keys for AsyncStorage
const SETTINGS_KEYS = {
    AUTO_SYNC: 'settings_auto_sync',
    SYNC_INTERVAL: 'settings_sync_interval',
};

interface DatabaseStats {
    users: number;
    transactions: number;
    gcashAccounts: number;
    feeSettings: number;
    syncLog: number;
}

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { syncAll, isSyncing, lastSyncTime, loadLastSyncTime, getUnsyncedCounts, unsyncedCount } = useSyncStore();

    const [autoSync, setAutoSync] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        loadSettings();
        loadLastSyncTime();
    }, [loadLastSyncTime]);

    const loadSettings = async () => {
        try {
            const autoSyncValue = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_SYNC);
            if (autoSyncValue !== null) {
                setAutoSync(autoSyncValue === 'true');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleAutoSyncToggle = async (value: boolean) => {
        try {
            setAutoSync(value);
            await AsyncStorage.setItem(SETTINGS_KEYS.AUTO_SYNC, String(value));

            if (value) {
                // Setup auto-sync when enabled
                SyncManager.setupAutoSync(() => {
                    console.log('Auto-sync triggered');
                });
                Alert.alert('Auto-Sync Enabled', 'Data will sync automatically when connected to the internet.');
            } else {
                Alert.alert('Auto-Sync Disabled', 'You will need to manually sync data.');
            }
        } catch (error) {
            console.error('Failed to toggle auto-sync:', error);
            Alert.alert('Error', 'Failed to update auto-sync setting');
        }
    };

    const handleChangeServerURL = () => {
        Alert.prompt(
            'Server URL',
            `Current: ${getBaseURL()}\n\nEnter new server URL:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    onPress: async (url?: string) => {
                        if (url && url.trim()) {
                            try {
                                await updateBaseURL(url.trim());
                                Alert.alert('Success', 'Server URL updated successfully. Please test the connection.');
                            } catch {
                                Alert.alert('Error', 'Failed to update server URL');
                            }
                        }
                    },
                },
            ],
            'plain-text',
            getBaseURL()
        );
    };

    const handleClearLocalData = async () => {
        Alert.alert(
            'Clear All Local Data',
            'This will delete all local transactions, accounts, and cached data. This action cannot be undone.\n\nYou will be logged out after clearing data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Data',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (Platform.OS === 'web') {
                                Alert.alert('Not Available', 'This feature is not available on web');
                                return;
                            }

                            // Reset database (drop and reinitialize)
                            resetDatabase();

                            // Reinitialize database with seed data
                            initializeDatabase();

                            // Clear AsyncStorage except auth token
                            const keys = await AsyncStorage.getAllKeys();
                            const keysToRemove = keys.filter(key => !key.includes('auth_token'));
                            await AsyncStorage.multiRemove(keysToRemove);

                            Alert.alert(
                                'Success',
                                'All local data has been cleared. You will now be logged out.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: async () => {
                                            await logout();
                                            router.replace('/(auth)/login');
                                        }
                                    }
                                ]
                            );
                        } catch (error) {
                            console.error('Failed to clear local data:', error);
                            Alert.alert('Error', 'Failed to clear local data');
                        }
                    },
                },
            ]
        );
    };

    const handleForceFullSync = async () => {
        Alert.alert(
            'Force Full Sync',
            'This will sync all local data to the server and pull the latest data. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sync',
                    onPress: async () => {
                        try {
                            // Check internet connection
                            const isConnected = await SyncManager.checkConnection();
                            if (!isConnected) {
                                Alert.alert('No Internet', 'Please connect to the internet to sync data.');
                                return;
                            }

                            await getUnsyncedCounts();
                            await syncAll();

                            Alert.alert('Success', 'Full sync completed successfully');
                        } catch (error: any) {
                            console.error('Failed to force sync:', error);
                            Alert.alert('Sync Failed', error instanceof Error ? error.message : 'Failed to sync data');
                        }
                    },
                },
            ]
        );
    };

    const handleTestConnection = async () => {
        try {
            const isConnected = await SyncManager.checkConnection();
            const serverURL = getBaseURL();

            Alert.alert(
                'Connection Status',
                `Server URL: ${serverURL}\n\n` +
                `Internet: ${isConnected ? '✅ Connected' : '❌ Offline'}\n\n` +
                `Last Sync: ${lastSyncTime || 'Never'}\n` +
                `Unsynced Items: ${unsyncedCount}`,
                [{ text: 'OK' }]
            );
        } catch {
            Alert.alert('Error', 'Failed to test connection');
        }
    };

    const loadDatabaseStats = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Database stats are not available on web');
            return;
        }

        setIsLoadingStats(true);
        try {
            const stats: DatabaseStats = {
                users: 0,
                transactions: 0,
                gcashAccounts: 0,
                feeSettings: 0,
                syncLog: 0,
            };

            // Get counts from each table using synchronous API
            try {
                const r1: any = db.getFirstSync('SELECT COUNT(*) as count FROM users');
                stats.users = r1?.count ?? 0;
            } catch { /* table may not exist */ }
            try {
                const r2: any = db.getFirstSync('SELECT COUNT(*) as count FROM transactions');
                stats.transactions = r2?.count ?? 0;
            } catch { /* table may not exist */ }
            try {
                const r3: any = db.getFirstSync('SELECT COUNT(*) as count FROM gcash_accounts');
                stats.gcashAccounts = r3?.count ?? 0;
            } catch { /* table may not exist */ }
            try {
                const r4: any = db.getFirstSync('SELECT COUNT(*) as count FROM fee_settings');
                stats.feeSettings = r4?.count ?? 0;
            } catch { /* table may not exist */ }
            try {
                const r5: any = db.getFirstSync('SELECT COUNT(*) as count FROM sync_log');
                stats.syncLog = r5?.count ?? 0;
            } catch { /* table may not exist */ }

            setDbStats(stats);
            setShowStats(true);
        } catch {
            console.error('Failed to load database stats');
            Alert.alert('Error', 'Failed to load database statistics');
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleExportData = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Data export is not available on web');
            return;
        }

        Alert.alert(
            'Export Data',
            'Export all local data as JSON (for backup or debugging)',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export',
                    onPress: async () => {
                        try {
                            // Get all data from tables
                            const exportData: any = {
                                exportDate: new Date().toISOString(),
                                appVersion: '1.0.0',
                                user: user,
                                transactions: [],
                                gcashAccounts: [],
                                feeSettings: [],
                            };

                            try {
                                exportData.transactions = db.getAllSync('SELECT * FROM transactions');
                                exportData.gcashAccounts = db.getAllSync('SELECT * FROM gcash_accounts');
                                exportData.feeSettings = db.getAllSync('SELECT * FROM fee_settings');
                            } catch (e) {
                                console.error('Error reading tables for export:', e);
                            }

                            const jsonString = JSON.stringify(exportData, null, 2);

                            // Share the data
                            await Share.share({
                                message: jsonString,
                                title: 'JCash Data Export',
                            });
                        } catch (error) {
                            console.error('Failed to export data:', error);
                            Alert.alert('Error', 'Failed to export data');
                        }
                    },
                },
            ]
        );
    };

    const handleChangePassword = () => {
        Alert.alert(
            'Change Password',
            'This feature requires server implementation. Contact your administrator to change your password.',
            [{ text: 'OK' }]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.backButton} />
            </View>

            {/* Account Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{user?.name || 'User'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                            <Text style={styles.userRole}>Role: {user?.role || 'User'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
                        <Text style={styles.changePasswordText}>Change Password</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Server Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Server Configuration</Text>

                {Platform.OS !== 'web' && (
                    <TouchableOpacity style={styles.item} onPress={handleChangeServerURL}>
                        <View style={styles.itemLeft}>
                            <Text style={styles.itemIcon}>🌐</Text>
                            <View>
                                <Text style={styles.itemText}>Server URL</Text>
                                <Text style={styles.itemSubtext}>{getBaseURL()}</Text>
                            </View>
                        </View>
                        <Text style={styles.itemArrow}>›</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.item} onPress={handleTestConnection}>
                    <View style={styles.itemLeft}>
                        <Text style={styles.itemIcon}>📡</Text>
                        <Text style={styles.itemText}>Test Connection</Text>
                    </View>
                    <Text style={styles.itemArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Sync Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sync Settings</Text>

                <View style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Text style={styles.itemIcon}>🔄</Text>
                        <View>
                            <Text style={styles.itemText}>Auto-Sync</Text>
                            <Text style={styles.itemSubtext}>Sync when connected</Text>
                        </View>
                    </View>
                    <Switch
                        value={autoSync}
                        onValueChange={handleAutoSyncToggle}
                        trackColor={{ false: '#ccc', true: '#34C759' }}
                        thumbColor="#fff"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.item, isSyncing && styles.itemDisabled]}
                    onPress={handleForceFullSync}
                    disabled={isSyncing}
                >
                    <View style={styles.itemLeft}>
                        <Text style={styles.itemIcon}>⚡</Text>
                        <View>
                            <Text style={styles.itemText}>Force Full Sync</Text>
                            <Text style={styles.itemSubtext}>
                                {lastSyncTime ? `Last: ${lastSyncTime}` : 'Never synced'}
                            </Text>
                        </View>
                    </View>
                    {isSyncing ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <Text style={styles.itemArrow}>›</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.item, styles.dangerItem]} onPress={handleClearLocalData}>
                    <View style={styles.itemLeft}>
                        <Text style={styles.itemIcon}>🗑️</Text>
                        <View>
                            <Text style={[styles.itemText, styles.dangerText]}>Clear All Local Data</Text>
                            <Text style={styles.itemSubtext}>Removes all offline data</Text>
                        </View>
                    </View>
                    <Text style={styles.itemArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Database Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Database</Text>

                <TouchableOpacity
                    style={styles.item}
                    onPress={loadDatabaseStats}
                    disabled={isLoadingStats}
                >
                    <View style={styles.itemLeft}>
                        <Text style={styles.itemIcon}>📊</Text>
                        <Text style={styles.itemText}>View Database Stats</Text>
                    </View>
                    {isLoadingStats ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <Text style={styles.itemArrow}>›</Text>
                    )}
                </TouchableOpacity>

                {showStats && dbStats && (
                    <View style={styles.statsCard}>
                        <Text style={styles.statsTitle}>Database Records</Text>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsLabel}>Users:</Text>
                            <Text style={styles.statsValue}>{dbStats.users}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsLabel}>Transactions:</Text>
                            <Text style={styles.statsValue}>{dbStats.transactions}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsLabel}>GCash Accounts:</Text>
                            <Text style={styles.statsValue}>{dbStats.gcashAccounts}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsLabel}>Fee Settings:</Text>
                            <Text style={styles.statsValue}>{dbStats.feeSettings}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsLabel}>Sync Log:</Text>
                            <Text style={styles.statsValue}>{dbStats.syncLog}</Text>
                        </View>
                        <View style={[styles.statsRow, styles.statsTotalRow]}>
                            <Text style={styles.statsTotalLabel}>Total Records:</Text>
                            <Text style={styles.statsTotalValue}>
                                {dbStats.users + dbStats.transactions + dbStats.gcashAccounts +
                                    dbStats.feeSettings + dbStats.syncLog}
                            </Text>
                        </View>
                    </View>
                )}

                {Platform.OS !== 'web' && (
                    <TouchableOpacity style={styles.item} onPress={handleExportData}>
                        <View style={styles.itemLeft}>
                            <Text style={styles.itemIcon}>📤</Text>
                            <View>
                                <Text style={styles.itemText}>Export Data</Text>
                                <Text style={styles.itemSubtext}>Backup as JSON</Text>
                            </View>
                        </View>
                        <Text style={styles.itemArrow}>›</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* About Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.card}>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>App Name:</Text>
                        <Text style={styles.aboutValue}>JCash Mobile</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version:</Text>
                        <Text style={styles.aboutValue}>1.0.0</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Build:</Text>
                        <Text style={styles.aboutValue}>20260129</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Platform:</Text>
                        <Text style={styles.aboutValue}>{Platform.OS}</Text>
                    </View>
                    <View style={styles.aboutDivider} />
                    <Text style={styles.aboutDescription}>
                        Offline-first GCash management system with automatic sync and transaction tracking.
                    </Text>
                    <View style={styles.aboutDivider} />
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Developer:</Text>
                        <Text style={styles.aboutValue}>JCash Team</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Support:</Text>
                        <Text style={styles.aboutValue}>support@jcash.com</Text>
                    </View>
                </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2026 JCash Mobile</Text>
                <Text style={styles.footerSubtext}>All rights reserved</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 28,
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    changePasswordButton: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    changePasswordText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    itemDisabled: {
        opacity: 0.6,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    itemText: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    itemSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    itemArrow: {
        fontSize: 24,
        color: '#ccc',
    },
    dangerItem: {
        borderLeftWidth: 3,
        borderLeftColor: '#ff3b30',
    },
    dangerText: {
        color: '#ff3b30',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsLabel: {
        fontSize: 14,
        color: '#666',
    },
    statsValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    statsTotalRow: {
        borderBottomWidth: 0,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#007AFF',
    },
    statsTotalLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    statsTotalValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#007AFF',
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    aboutLabel: {
        fontSize: 14,
        color: '#666',
    },
    aboutValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    aboutDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 12,
    },
    aboutDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
    },
    logoutButton: {
        backgroundColor: '#ff3b30',
        marginHorizontal: 20,
        marginTop: 32,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
    },
    footerSubtext: {
        fontSize: 11,
        color: '#ccc',
        marginTop: 4,
    },
});
