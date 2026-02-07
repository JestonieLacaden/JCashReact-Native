import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTransactionStore } from '../store/transactionStore';
import type { Transaction } from '../types';

type FilterType = 'all' | 'cashin' | 'cashout' | 'transfer';

export default function TransactionListScreen() {
    const router = useRouter();
    const { transactions, loadTransactions, isLoading } = useTransactionStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

    // Load transactions on mount
    useEffect(() => {
        loadData();
    }, []);

    // Filter and search transactions when data changes
    useEffect(() => {
        filterTransactions();
    }, [transactions, searchQuery, filterType]);

    const loadData = async () => {
        loadTransactions();
    };

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        loadTransactions();
        setRefreshing(false);
    }, []);

    // Filter transactions based on search and filter type
    const filterTransactions = () => {
        let filtered = [...transactions];

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter((t) => {
                const type = t.type?.toLowerCase();
                if (filterType === 'cashin') return type === 'cashin' || type === 'cash_in';
                if (filterType === 'cashout') return type === 'cashout' || type === 'cash_out';
                if (filterType === 'transfer') return type === 'transfer';
                return true;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((t) => {
                const reference = t.reference?.toLowerCase() || '';
                const remarks = t.remarks?.toLowerCase() || '';
                const receiverName = t.receiver_name?.toLowerCase() || '';
                const customerPhone = t.customer_phone?.toLowerCase() || '';
                return (
                    reference.includes(query) ||
                    remarks.includes(query) ||
                    receiverName.includes(query) ||
                    customerPhone.includes(query)
                );
            });
        }

        setFilteredTransactions(filtered);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `₱${Math.abs(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    };

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (isYesterday) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get transaction type display
    const getTransactionTypeDisplay = (type?: string) => {
        if (!type) return 'Unknown';
        const normalized = type.toLowerCase().replace('_', ' ');
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    // Get transaction color based on type
    const getTransactionColor = (type?: string) => {
        const normalized = type?.toLowerCase() || '';
        if (normalized.includes('in')) return '#34C759';
        if (normalized.includes('out')) return '#FF3B30';
        return '#5856D6';
    };

    // Get status badge color
    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
                return { bg: '#d4edda', text: '#155724' };
            case 'pending':
                return { bg: '#fff3cd', text: '#856404' };
            case 'failed':
            case 'cancelled':
                return { bg: '#f8d7da', text: '#721c24' };
            default:
                return { bg: '#e2e3e5', text: '#383d41' };
        }
    };

    // Render transaction item
    const renderTransaction = ({ item }: { item: Transaction }) => {
        const typeColor = getTransactionColor(item.type);
        const statusColors = getStatusColor(item.status);
        const isIncoming = item.type?.toLowerCase().includes('in');

        return (
            <TouchableOpacity
                style={styles.transactionCard}
                activeOpacity={0.7}
                onPress={() => {
                    // Navigate to transaction detail or show modal
                    console.log('Transaction pressed:', item.id);
                }}
            >
                <View style={styles.transactionContent}>
                    {/* Left: Type Icon & Details */}
                    <View style={styles.leftSection}>
                        <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
                            <Text style={[styles.typeIconText, { color: typeColor }]}>
                                {isIncoming ? '↓' : '↑'}
                            </Text>
                        </View>
                        <View style={styles.detailsSection}>
                            <Text style={styles.transactionType}>
                                {getTransactionTypeDisplay(item.type)}
                            </Text>
                            <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
                            {item.reference && (
                                <Text style={styles.transactionRef}>Ref: {item.reference}</Text>
                            )}
                            {item.receiver_name && (
                                <Text style={styles.transactionReceiver}>To: {item.receiver_name}</Text>
                            )}
                            {item.customer_phone && (
                                <Text style={styles.transactionReceiver}>📱 {item.customer_phone}</Text>
                            )}
                        </View>
                    </View>

                    {/* Right: Amount & Status */}
                    <View style={styles.rightSection}>
                        <Text style={[styles.amount, { color: typeColor }]}>
                            {isIncoming ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                            <Text style={[styles.statusText, { color: statusColors.text }]}>
                                {item.status || 'Pending'}
                            </Text>
                        </View>
                        {item.is_synced === 0 && (
                            <View style={styles.unsyncedIndicator}>
                                <Text style={styles.unsyncedIcon}>⚠️</Text>
                                <Text style={styles.unsyncedText}>Not synced</Text>
                            </View>
                        )}
                    </View>
                </View>

                {item.remarks && (
                    <Text style={styles.remarks} numberOfLines={1}>
                        💬 {item.remarks}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    // Render empty state
    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.emptyText}>Loading transactions...</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptyText}>
                    {searchQuery || filterType !== 'all'
                        ? 'No transactions match your filters'
                        : 'Your transactions will appear here'}
                </Text>
            </View>
        );
    };

    // Render filter button
    const renderFilterButton = (type: FilterType, label: string) => {
        const isActive = filterType === type;
        return (
            <TouchableOpacity
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setFilterType(type)}
            >
                <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Transactions</Text>
                <Text style={styles.headerCount}>
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'item' : 'items'}
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by reference or remarks..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={styles.clearButton}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {renderFilterButton('all', 'All')}
                {renderFilterButton('cashin', 'Cash In')}
                {renderFilterButton('cashout', 'Cash Out')}
                {renderFilterButton('transfer', 'Transfer')}
            </View>

            {/* Transaction List */}
            <FlatList
                data={filteredTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
            />
        </View>
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerCount: {
        fontSize: 14,
        color: '#666',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
    },
    clearButton: {
        fontSize: 20,
        color: '#999',
        paddingHorizontal: 8,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    filterButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    transactionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leftSection: {
        flexDirection: 'row',
        flex: 1,
    },
    typeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    typeIconText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    detailsSection: {
        flex: 1,
        justifyContent: 'center',
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    transactionDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    transactionRef: {
        fontSize: 11,
        color: '#999',
    },
    transactionReceiver: {
        fontSize: 11,
        color: '#007AFF',
    },
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    unsyncedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    unsyncedIcon: {
        fontSize: 10,
        marginRight: 4,
    },
    unsyncedText: {
        fontSize: 9,
        color: '#FF9500',
        fontWeight: '500',
    },
    remarks: {
        fontSize: 13,
        color: '#666',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
