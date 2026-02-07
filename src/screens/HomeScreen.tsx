import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import AppHeader from '../components/AppHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import FloatingActionButton from '../components/FloatingActionButton';
import GCashAccountsModal from '../components/GCashAccountsModal';
import SyncStatusBar from '../components/SyncStatusBar';
import { BalanceCalculator } from '../services/BalanceCalculator';
import { GcashAccountService } from '../services/GcashAccountService';
import { useAuthStore } from '../store/authStore';

interface DashboardStats {
    totalGcash: number;
    cashOnHand: number;
    totalCapital: number;
    tuboToday: number;
}

interface GCashAccount {
    id: number;
    name: string;
    balance: number;
    percentage: number;
    status: 'active' | 'low' | 'empty';
}

export default function HomeScreen() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const canManageTransactions = isAdmin || isStaff;

    const [stats, setStats] = useState<DashboardStats>({
        totalGcash: 0,
        cashOnHand: 0,
        totalCapital: 0,
        tuboToday: 0,
    });
    const [gcashAccounts, setGCashAccounts] = useState<GCashAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showGcashModal, setShowGcashModal] = useState(false);

    const loadDashboardData = async (showLoader = true) => {
        if (showLoader) {
            setIsLoading(true);
        }

        try {
            // Get balances from BalanceCalculator (transaction-based)
            const cashResult = await BalanceCalculator.getCashBalance();
            const totalGcashResult = await BalanceCalculator.getTotalGcashBalance();
            const totalCapitalResult = await BalanceCalculator.getTotalCapital();
            const tuboResult = await BalanceCalculator.getTodayProfit();

            setStats({
                cashOnHand: cashResult.balance,
                totalGcash: totalGcashResult.balance,
                totalCapital: totalCapitalResult.balance,
                tuboToday: tuboResult.balance,
            });

            // Get GCash accounts with calculated balances
            const accounts = GcashAccountService.getActiveAccounts();
            const accountsWithBalance = accounts.map(async (account, index) => {
                const balanceResult = await BalanceCalculator.getGcashBalance(account.id);
                const balance = balanceResult.balance;
                const percentage = totalGcashResult.balance > 0
                    ? (balance / totalGcashResult.balance) * 100
                    : 0;

                // Determine status
                let status: 'active' | 'low' | 'empty' = 'active';
                if (balance === 0) status = 'empty';
                else if (balance < 5000) status = 'low';

                return {
                    id: index + 1, // Use numeric ID for UI
                    name: account.name,
                    balance: balance,
                    percentage: percentage,
                    status: status,
                };
            });
            const resolvedAccounts = await Promise.all(accountsWithBalance);
            setGCashAccounts(resolvedAccounts);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            if (showLoader) {
                // Show skeleton for minimum 600ms for smooth UX
                setTimeout(() => {
                    setIsLoading(false);
                }, 600);
            }
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDashboardData(false);
        setRefreshing(false);
    }, []);

    // Load on mount
    useEffect(() => {
        loadDashboardData();
    }, []);

    // Reload when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadDashboardData(false);
        }, [])
    );

    return (
        <View style={styles.container}>
            {/* App Header */}
            <AppHeader />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary]}
                    />
                }
            >
                {/* Page Header */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Dashboard</Text>
                </View>

                {/* Sync Status Bar */}
                <SyncStatusBar />

                {isLoading ? (
                    <DashboardSkeleton />
                ) : (
                    <View style={styles.content}>
                        {/* Top Row: Total GCash & Cash on Hand */}
                        <View style={styles.topRow}>
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => setShowGcashModal(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardLabel}>Total GCash</Text>
                                    <View style={styles.infoIcon}>
                                        <Text style={styles.infoIconText}>ⓘ</Text>
                                    </View>
                                </View>
                                <Text style={styles.cardValue}>
                                    ₱ {stats.totalGcash.toLocaleString()}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Cash on Hand</Text>
                                <Text style={styles.cardValue}>
                                    ₱ {stats.cashOnHand.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* Total Capital */}
                        <View style={styles.wideCard}>
                            <Text style={styles.cardLabel}>Total Capital</Text>
                            <Text style={styles.largeValue}>
                                ₱ {stats.totalCapital.toLocaleString()}
                            </Text>
                        </View>

                        {/* Tubo Today */}
                        <View style={styles.wideCard}>
                            <Text style={styles.cardLabel}>Tubo Today</Text>
                            <Text style={[styles.largeValue, { color: COLORS.success }]}>
                                ₱ {stats.tuboToday.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Bottom spacing for tab bar */}
                <View style={{ height: 24 }} />
            </ScrollView>

            {/* GCash Accounts Modal */}
            <GCashAccountsModal
                visible={showGcashModal}
                accounts={gcashAccounts}
                totalBalance={stats.totalGcash}
                lastUpdated={new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })}
                onClose={() => setShowGcashModal(false)}
            />

            {/* Floating Action Button */}
            <FloatingActionButton visible={canManageTransactions} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 96,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    content: {
        maxWidth: 768,
        width: '100%',
        alignSelf: 'center',
    },
    topRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    infoIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoIconText: {
        fontSize: 14,
        color: COLORS.primary,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    wideCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
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
    largeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
});
