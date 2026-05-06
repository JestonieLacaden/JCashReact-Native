import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import AppHeader from '../components/AppHeader';
import ConfirmModal, { ConfirmOption } from '../components/ConfirmModal';
import EarningsSummaryModal, { EarningsData } from '../components/EarningsSummaryModal';
import FilterTransactionsModal, {
    DatePreset,
    FilterState
} from '../components/FilterTransactionsModal';
import HistorySkeleton from '../components/HistorySkeleton';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { GcashAccount, GcashAccountService } from '../services/GcashAccountService';
import { Transaction, TransactionService } from '../services/TransactionService';
import { useAuthStore } from '../store/authStore';

// ── Helpers ──

const TYPE_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; icon: string; iconSet: 'ion' | 'mci' }
> = {
    cash_in: {
        label: 'Cash In',
        color: COLORS.success,
        bg: COLORS.successLight,
        icon: 'cash-plus',
        iconSet: 'mci',
    },
    cash_out: {
        label: 'Cash Out',
        color: COLORS.danger,
        bg: COLORS.dangerLight,
        icon: 'cash-minus',
        iconSet: 'mci',
    },
    capital_move: {
        label: 'Capital Move',
        color: COLORS.purple,
        bg: COLORS.purpleLight,
        icon: 'swap-horizontal',
        iconSet: 'ion',
    },
    adjustment: {
        label: 'Adjustment',
        color: COLORS.info,
        bg: COLORS.infoLight,
        icon: 'construct',
        iconSet: 'ion',
    },
};

function formatCurrency(amount: number): string {
    return `₱${Math.abs(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
        return '';
    }
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return '';
    }
}

/** Return start/end ISO strings for a date preset */
function getDateRange(preset: DatePreset): { start: string; end: string } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    switch (preset) {
        case 'today':
            return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
        case 'yesterday': {
            const yStart = new Date(todayStart);
            yStart.setDate(yStart.getDate() - 1);
            return { start: yStart.toISOString(), end: todayStart.toISOString() };
        }
        case 'last_7': {
            const s7 = new Date(todayStart);
            s7.setDate(s7.getDate() - 6);
            return { start: s7.toISOString(), end: todayEnd.toISOString() };
        }
        case 'last_30': {
            const s30 = new Date(todayStart);
            s30.setDate(s30.getDate() - 29);
            return { start: s30.toISOString(), end: todayEnd.toISOString() };
        }
        default:
            return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    }
}

function getDateLabel(preset: DatePreset, customStart?: string | null, customEnd?: string | null): string {
    switch (preset) {
        case 'today':
            return 'Today';
        case 'yesterday':
            return 'Yesterday';
        case 'last_7':
            return 'Last 7 Days';
        case 'last_30':
            return 'Last 30 Days';
        case 'custom':
            if (customStart && customEnd) {
                return `${customStart} – ${customEnd}`;
            }
            return 'Custom Range';
        default:
            return 'Today';
    }
}

// ── Main Screen ──

export default function HistoryScreen() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // Data state
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<GcashAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    // Filters
    const [filters, setFilters] = useState<FilterState>({
        datePreset: 'today',
        customStartDate: null,
        customEndDate: null,
        transactionType: 'all',
        accountId: null,
    });

    // Modals
    const [showEarnings, setShowEarnings] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);

    // Ref for FlatList
    const listRef = useRef<FlatList>(null);
    const searchInputRef = useRef<TextInput>(null);

    // ── Data Loading ──
    const loadData = useCallback(async () => {
        try {
            let start: string;
            let end: string;

            if (filters.datePreset === 'custom' && filters.customStartDate && filters.customEndDate) {
                // Parse MM/DD/YYYY from custom fields
                const parseDate = (s: string) => {
                    const parts = s.split('/');
                    if (parts.length === 3) {
                        return new Date(+parts[2], +parts[0] - 1, +parts[1]);
                    }
                    return new Date();
                };
                const sd = parseDate(filters.customStartDate);
                const ed = parseDate(filters.customEndDate);
                ed.setDate(ed.getDate() + 1); // include full end day
                start = sd.toISOString();
                end = ed.toISOString();
            } else {
                const range = getDateRange(filters.datePreset);
                start = range.start;
                end = range.end;
            }

            const txns = TransactionService.getTransactionsByDateRange(start, end);
            const accs = GcashAccountService.getActiveAccounts();
            setAllTransactions(txns);
            setAccounts(accs);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }, [filters.datePreset, filters.customStartDate, filters.customEndDate]);

    useEffect(() => {
        setLoading(true);
        loadData().finally(() => setLoading(false));
    }, [loadData]);

    // Reload when tab is focused — show brief skeleton for "refresh" feel
    // Skip skeleton if there's no data (empty state shows immediately)
    useFocusEffect(
        useCallback(() => {
            // Only flash skeleton if we already have some data loaded
            const shouldShowSkeleton = allTransactions.length > 0;
            if (shouldShowSkeleton) setLoading(true);
            loadData().finally(() => {
                if (shouldShowSkeleton) {
                    setTimeout(() => setLoading(false), 400);
                }
            });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loadData]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // ── Account map for quick lookups ──
    const accountMap = useMemo(() => {
        const map: Record<string, GcashAccount> = {};
        for (const a of accounts) {
            map[a.id] = a;
        }
        return map;
    }, [accounts]);

    // ── Filtered + Searched Transactions ──
    const filteredTransactions = useMemo(() => {
        let txns = allTransactions;

        // Type filter
        if (filters.transactionType !== 'all') {
            txns = txns.filter((t) => t.type === filters.transactionType);
        }

        // Account filter
        if (filters.accountId === 'cash_wallet') {
            // Cash wallet = transactions with no gcash account (pure cash)
            txns = txns.filter(
                (t) =>
                    !t.gcash_account_id &&
                    !t.from_account_id &&
                    !t.to_account_id,
            );
        } else if (filters.accountId) {
            txns = txns.filter(
                (t) =>
                    t.gcash_account_id === filters.accountId ||
                    t.from_account_id === filters.accountId ||
                    t.to_account_id === filters.accountId,
            );
        }

        // Staff can only see cash_in / cash_out
        if (!isAdmin) {
            txns = txns.filter((t) => t.type === 'cash_in' || t.type === 'cash_out');
        }

        // Search (reference or account name)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            txns = txns.filter((t) => {
                // Match reference
                if (t.reference?.toLowerCase().includes(q)) return true;
                // Match account name
                const acc = t.gcash_account_id ? accountMap[t.gcash_account_id] : null;
                if (acc && acc.name.toLowerCase().includes(q)) return true;
                // Match receiver name
                if (t.receiver_name?.toLowerCase().includes(q)) return true;
                return false;
            });
        }

        return txns;
    }, [allTransactions, filters.transactionType, filters.accountId, isAdmin, searchQuery, accountMap]);

    // ── Earnings Data ──
    const earningsData = useMemo<EarningsData>(() => {
        let totalFees = 0;
        let cashInCount = 0;
        let cashOutCount = 0;
        let cashInTotal = 0;
        let cashOutTotal = 0;
        let adjustmentCount = 0;
        let capitalMoveCount = 0;

        for (const t of allTransactions) {
            if (t.type === 'cash_in') {
                totalFees += t.fee;
                cashInCount++;
                cashInTotal += t.amount;
            } else if (t.type === 'cash_out') {
                totalFees += t.fee;
                cashOutCount++;
                cashOutTotal += t.amount;
            } else if (t.type === 'adjustment') {
                adjustmentCount++;
            } else if (t.type === 'capital_move') {
                capitalMoveCount++;
            }
        }

        return {
            totalFees,
            cashInCount,
            cashOutCount,
            cashInTotal,
            cashOutTotal,
            adjustmentCount,
            capitalMoveCount,
            totalTransactions: allTransactions.length,
        };
    }, [allTransactions]);

    // ── Active filter count ──
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.datePreset !== 'today') count++;
        if (filters.transactionType !== 'all') count++;
        if (filters.accountId !== null) count++;
        return count;
    }, [filters]);

    // ── Export CSV ──
    const handleExport = useCallback(
        async (type: 'full' | 'daily') => {
            try {
                const txns = type === 'daily' ? allTransactions : TransactionService.getAllTransactions();

                if (txns.length === 0) {
                    // No data — will just do nothing, the modal itself handles UX
                    return;
                }

                // Build CSV
                const headers = [
                    'Reference',
                    'Type',
                    'Amount',
                    'Fee',
                    'Discounted',
                    'Account',
                    'Receiver',
                    'Phone',
                    'Remarks',
                    'Status',
                    'Date',
                ];
                const rows = txns.map((t) => {
                    const accName = t.gcash_account_id ? (accountMap[t.gcash_account_id]?.name || '') : '';
                    return [
                        t.reference,
                        t.type,
                        t.amount.toString(),
                        t.fee.toString(),
                        t.discounted ? 'Yes' : 'No',
                        accName,
                        t.receiver_name || '',
                        t.customer_phone || '',
                        (t.remarks || '').replace(/,/g, ';'),
                        t.status,
                        t.created_at,
                    ].join(',');
                });

                const csv = [headers.join(','), ...rows].join('\n');
                const dateStr = new Date().toISOString().slice(0, 10);
                const fileName = type === 'daily' ? `jcash-daily-${dateStr}.csv` : `jcash-full-export-${dateStr}.csv`;

                if (Platform.OS === 'web') {
                    return;
                }

                const file = new File(Paths.document, fileName);
                file.write(csv);
                const filePath = file.uri;

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(filePath, {
                        mimeType: 'text/csv',
                        dialogTitle: `Export ${type === 'daily' ? 'Daily' : 'Full'} CSV`,
                    });
                } else {
                    console.log('Saved to:', filePath);
                }
            } catch (error) {
                console.error('Export error:', error);
            }
        },
        [allTransactions, accountMap],
    );

    const showExportMenu = useCallback(() => {
        setShowExportConfirm(true);
    }, []);

    const exportOptions = useMemo<ConfirmOption[]>(
        () => [
            {
                label: 'Export Daily CSV',
                icon: 'today-outline',
                variant: 'primary' as const,
                onPress: () => handleExport('daily'),
            },
            {
                label: 'Export Full CSV',
                icon: 'cloud-download-outline',
                variant: 'primary' as const,
                onPress: () => handleExport('full'),
            },
            {
                label: 'Cancel',
                variant: 'outline' as const,
                onPress: () => { },
            },
        ],
        [handleExport],
    );

    // ── Render Transaction Card ──
    const renderTransactionCard = useCallback(
        ({ item: t }: { item: Transaction }) => {
            const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.cash_in;
            const accName = t.gcash_account_id
                ? accountMap[t.gcash_account_id]?.name || 'Unknown'
                : t.type === 'capital_move'
                    ? `${accountMap[t.from_account_id || '']?.name || 'Cash'} → ${accountMap[t.to_account_id || '']?.name || 'Cash'}`
                    : 'Cash Wallet';

            return (
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => {
                        setSelectedTransaction(t);
                        setShowDetail(true);
                    }}
                >
                    {/* Icon */}
                    <View style={[styles.cardIcon, { backgroundColor: config.bg }]}>
                        {config.iconSet === 'mci' ? (
                            <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
                        ) : (
                            <Ionicons name={config.icon as any} size={22} color={config.color} />
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                        <View style={styles.cardTopRow}>
                            <View style={[styles.cardTypeBadge, { backgroundColor: config.bg }]}>
                                <Text style={[styles.cardTypeText, { color: config.color }]}>{config.label}</Text>
                            </View>
                            <Text style={[styles.cardAmount, { color: config.color }]}>
                                {t.type === 'cash_out' || (t.type === 'adjustment' && t.amount < 0) ? '-' : '+'}
                                {formatCurrency(t.amount)}
                            </Text>
                        </View>

                        <Text style={styles.cardAccount} numberOfLines={1}>
                            {accName}
                        </Text>

                        <View style={styles.cardBottomRow}>
                            <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                            <Text style={styles.cardTime}>
                                {formatDate(t.created_at)} · {formatTime(t.created_at)}
                            </Text>
                            {t.fee > 0 && (
                                <View style={styles.cardFeeBadge}>
                                    <Text style={styles.cardFeeText}>Fee: ₱{t.fee}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
            );
        },
        [accountMap],
    );

    const keyExtractor = useCallback((item: Transaction) => item.id, []);

    // ── Empty State ──
    const EmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery
                    ? 'No results match your search.'
                    : activeFilterCount > 0
                        ? 'No transactions match the current filters.'
                        : 'Transactions will appear here once created.'}
            </Text>
        </View>
    );

    // ── Header Component for FlatList ──
    // Memoized as a raw element (not a component) to prevent TextInput remount/keyboard bugs
    const listHeader = useMemo(
        () => (
            <View>
                {/* Unified search + action icons row */}
                <View style={styles.toolbarRow}>
                    <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
                        <Ionicons name="search" size={17} color={searchFocused ? COLORS.primary : COLORS.textTertiary} />
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor={COLORS.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={17} color={COLORS.textTertiary} />
                            </Pressable>
                        )}
                    </View>

                    {/* Icon-only action buttons */}
                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                        onPress={() => setShowEarnings(true)}
                    >
                        <View style={[styles.iconBtnInner, { backgroundColor: COLORS.success + '14' }]}>
                            <Ionicons name="stats-chart" size={18} color={COLORS.success} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                        onPress={() => setShowFilters(true)}
                    >
                        <View
                            style={[
                                styles.iconBtnInner,
                                {
                                    backgroundColor: activeFilterCount > 0 ? COLORS.primary + '14' : COLORS.background,
                                    borderWidth: activeFilterCount > 0 ? 1.5 : 0,
                                    borderColor: activeFilterCount > 0 ? COLORS.primary + '30' : 'transparent',
                                },
                            ]}
                        >
                            <Ionicons
                                name="options"
                                size={18}
                                color={activeFilterCount > 0 ? COLORS.primary : COLORS.textSecondary}
                            />
                        </View>
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.iconBtn}
                            activeOpacity={0.7}
                            onPress={showExportMenu}
                        >
                            <View style={[styles.iconBtnInner, { backgroundColor: COLORS.info + '14' }]}>
                                <Ionicons name="share-outline" size={18} color={COLORS.info} />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Date label + count */}
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>
                        {getDateLabel(filters.datePreset, filters.customStartDate, filters.customEndDate)}
                    </Text>
                    <Text style={styles.resultCount}>
                        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>
        ),
        [searchFocused, searchQuery, activeFilterCount, isAdmin, filters, filteredTransactions.length, showExportMenu],
    );

    return (
        <View style={styles.container}>
            <AppHeader />

            {loading ? (
                <HistorySkeleton />
            ) : (
                <FlatList
                    ref={listRef}
                    data={filteredTransactions}
                    keyExtractor={keyExtractor}
                    renderItem={renderTransactionCard}
                    ListHeaderComponent={listHeader}
                    ListEmptyComponent={<EmptyList />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={7}
                />
            )}

            {/* ── Modals ── */}
            <EarningsSummaryModal
                visible={showEarnings}
                onClose={() => setShowEarnings(false)}
                data={earningsData}
                dateLabel={getDateLabel(filters.datePreset, filters.customStartDate, filters.customEndDate)}
            />

            <FilterTransactionsModal
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                onApply={setFilters}
                currentFilters={filters}
                accounts={accounts}
                isAdmin={isAdmin || false}
            />

            <TransactionDetailModal
                visible={showDetail}
                onClose={() => {
                    setShowDetail(false);
                    // Small delay before clearing to avoid flash
                    setTimeout(() => setSelectedTransaction(null), 200);
                }}
                transaction={selectedTransaction}
                accounts={accounts}
            />

            <ConfirmModal
                visible={showExportConfirm}
                onClose={() => setShowExportConfirm(false)}
                title="Export Transactions"
                message="Choose which transactions to export as a CSV file."
                icon="download-outline"
                iconColor={COLORS.info}
                options={exportOptions}
            />
        </View>
    );
}

// ── Styles ──

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 100,
    },

    // Toolbar row (search + icon buttons)
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    searchContainerFocused: {
        borderColor: COLORS.primary,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    iconBtn: {
        position: 'relative',
    },
    iconBtnInner: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: COLORS.danger,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.white,
    },

    // Results header
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    resultLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    resultCount: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },

    // Transaction Card
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    cardTypeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardAmount: {
        fontSize: 15,
        fontWeight: '800',
    },
    cardAccount: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardTime: {
        fontSize: 11,
        color: COLORS.textTertiary,
        flex: 1,
    },
    cardFeeBadge: {
        backgroundColor: COLORS.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    cardFeeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.warning,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
    },
});
