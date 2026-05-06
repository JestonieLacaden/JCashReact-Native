import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
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
import TYPOGRAPHY from '../../constants/typography';
import AppHeader from '../components/AppHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import GCashAccountsModal from '../components/GCashAccountsModal';
import SyncStatusBar from '../components/SyncStatusBar';
import { BalanceCalculator } from '../services/BalanceCalculator';
import { GcashAccountService } from '../services/GcashAccountService';

interface DashboardStats {
    totalGcash: number;
    cashOnHand: number;
    totalCapital: number;
    tuboToday: number;
}

interface GCashAccount {
    id: string;
    name: string;
    balance: number;
    percentage: number;
    status: 'active' | 'low' | 'empty';
}

export default function HomeScreen() {
    const router = useRouter();

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

            const accounts = GcashAccountService.getActiveAccounts();
            const accountsWithBalance = accounts.map(async (account) => {
                const balanceResult = await BalanceCalculator.getGcashBalance(account.id);
                const balance = balanceResult.balance;
                const percentage = totalGcashResult.balance > 0
                    ? (balance / totalGcashResult.balance) * 100
                    : 0;

                let status: 'active' | 'low' | 'empty' = 'active';
                if (balance === 0) status = 'empty';
                else if (balance < 5000) status = 'low';

                return {
                    id: account.id,
                    name: account.name,
                    balance,
                    percentage,
                    status,
                };
            });
            const resolvedAccounts = await Promise.all(accountsWithBalance);
            setGCashAccounts(resolvedAccounts);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            if (showLoader) {
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

    useEffect(() => {
        loadDashboardData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadDashboardData(false).finally(() => {
                setTimeout(() => setIsLoading(false), 400);
            });
        }, [])
    );

    const handleOpenTransaction = (type: 'cash_in' | 'cash_out', accountId: string) => {
        router.push(`/(tabs)/new-transaction?type=${type}&accountId=${accountId}`);
    };

    return (
        <View style={styles.container}>
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
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Dashboard</Text>
                </View>

                <SyncStatusBar />

                {isLoading ? (
                    <DashboardSkeleton />
                ) : (
                    <View style={styles.content}>
                        <View style={styles.topRow}>
                            <TouchableOpacity
                                style={[styles.card, styles.primaryCard]}
                                onPress={() => setShowGcashModal(true)}
                                activeOpacity={0.78}
                            >
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.cardLabel}>Total GCash</Text>
                                        <Text style={styles.cardCaption}>Tap to view all accounts</Text>
                                    </View>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                    </View>
                                </View>

                                <Text style={styles.cardValue}>P {stats.totalGcash.toLocaleString()}</Text>

                                <View style={styles.cardMetaRow}>
                                    <View style={styles.accountsBadge}>
                                        <Text style={styles.accountsBadgeText}>{gcashAccounts.length} accounts</Text>
                                    </View>
                                    <Text style={styles.cardMetaText}>Quick actions inside sheet</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.card, styles.secondaryCard]}>
                                <Text style={styles.cardLabel}>Cash on Hand</Text>
                                <Text style={styles.cardCaption}>Computed from local history</Text>
                                <Text style={styles.cardValue}>P {stats.cashOnHand.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.wideCard}>
                            <Text style={styles.cardLabel}>Total Capital</Text>
                            <Text style={styles.largeValue}>P {stats.totalCapital.toLocaleString()}</Text>
                        </View>

                        <View style={styles.wideCard}>
                            <Text style={styles.cardLabel}>Tubo Today</Text>
                            <Text style={[styles.largeValue, { color: COLORS.success }]}>
                                P {stats.tuboToday.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

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
                onCashIn={(accountId) => handleOpenTransaction('cash_in', accountId)}
                onCashOut={(accountId) => handleOpenTransaction('cash_out', accountId)}
            />
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
        fontFamily: TYPOGRAPHY.bold,
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
        borderRadius: 18,
        padding: 18,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 14,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 10px 24px rgba(17, 24, 39, 0.08)',
            },
        }),
    },
    primaryCard: {
        minHeight: 156,
        justifyContent: 'space-between',
    },
    secondaryCard: {
        minHeight: 156,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cardLabel: {
        fontSize: 12,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
    },
    cardCaption: {
        marginTop: 4,
        fontSize: 12,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textTertiary,
    },
    infoIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.primary + '14',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardValue: {
        fontSize: 30,
        fontFamily: TYPOGRAPHY.extraBold,
        color: COLORS.textPrimary,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    accountsBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: COLORS.primary + '12',
    },
    accountsBadgeText: {
        fontSize: 11,
        fontFamily: TYPOGRAPHY.semibold,
        color: COLORS.primary,
    },
    cardMetaText: {
        flex: 1,
        textAlign: 'right',
        fontSize: 11,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
    },
    wideCard: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 14,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 10px 24px rgba(17, 24, 39, 0.08)',
            },
        }),
    },
    largeValue: {
        fontSize: 24,
        fontFamily: TYPOGRAPHY.bold,
        color: COLORS.textPrimary,
        marginTop: 4,
    },
});
