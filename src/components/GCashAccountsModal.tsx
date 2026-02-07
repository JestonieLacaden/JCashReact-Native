import React from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import COLORS from '../../constants/colors';

interface GCashAccount {
    id: number;
    name: string;
    balance: number;
    percentage: number;
    status: 'active' | 'low' | 'empty';
}

interface GCashAccountsModalProps {
    visible: boolean;
    accounts: GCashAccount[];
    totalBalance: number;
    onClose: () => void;
    lastUpdated?: string;
}

export default function GCashAccountsModal({
    visible,
    accounts,
    totalBalance,
    onClose,
    lastUpdated,
}: GCashAccountsModalProps) {
    const activeAccounts = accounts.filter(acc => acc.status === 'active');

    const getAccountStyle = (status: string) => {
        switch (status) {
            case 'low':
                return {
                    container: styles.accountWarning,
                    icon: '⚠️',
                    iconBg: styles.iconWarning,
                };
            case 'empty':
                return {
                    container: styles.accountDanger,
                    icon: '⚠️',
                    iconBg: styles.iconDanger,
                };
            default:
                return {
                    container: styles.accountSuccess,
                    icon: '✓',
                    iconBg: styles.iconSuccess,
                };
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>GCash Accounts</Text>
                            {lastUpdated && (
                                <Text style={styles.subtitle}>
                                    Last updated: {lastUpdated}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeIcon}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Total Balance */}
                        <View style={styles.totalBalanceCard}>
                            <Text style={styles.totalBalanceLabel}>
                                Total GCash Balance
                            </Text>
                            <Text style={styles.totalBalanceAmount}>
                                ₱{totalBalance.toLocaleString()}
                            </Text>
                            <Text style={styles.activeAccountsText}>
                                {activeAccounts.length} active account
                                {activeAccounts.length !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* Accounts List */}
                        <View style={styles.accountsList}>
                            {accounts.map((account) => {
                                const accountStyle = getAccountStyle(account.status);
                                return (
                                    <View
                                        key={account.id}
                                        style={[
                                            styles.accountCard,
                                            accountStyle.container,
                                        ]}
                                    >
                                        <View style={styles.accountInfo}>
                                            <Text style={styles.accountName}>
                                                {account.name}
                                            </Text>
                                            <View style={styles.accountDetails}>
                                                <Text style={styles.accountBalance}>
                                                    ₱{account.balance.toLocaleString()}
                                                </Text>
                                                <Text style={styles.accountPercentage}>
                                                    {account.percentage.toFixed(1)}%
                                                </Text>
                                            </View>
                                        </View>
                                        {account.status === 'low' && (
                                            <View style={styles.lowBadge}>
                                                <Text style={styles.lowBadgeText}>Low</Text>
                                            </View>
                                        )}
                                        <View style={[styles.iconContainer, accountStyle.iconBg]}>
                                            <Text style={styles.iconText}>
                                                {accountStyle.icon}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBottomButton}
                    >
                        <Text style={styles.closeBottomButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        ...Platform.select({
            web: {
                justifyContent: 'center',
                alignItems: 'center',
            },
        }),
    },
    modalContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        ...Platform.select({
            web: {
                borderRadius: 16,
                width: '90%',
                maxWidth: 500,
                maxHeight: '80%',
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 24,
        color: COLORS.textSecondary,
    },
    scrollView: {
        padding: 20,
    },
    totalBalanceCard: {
        backgroundColor: COLORS.primaryLight + '20',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    totalBalanceLabel: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
        marginBottom: 8,
    },
    totalBalanceAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 8,
    },
    activeAccountsText: {
        fontSize: 13,
        color: COLORS.primary,
    },
    accountsList: {
        gap: 12,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    accountSuccess: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.border,
    },
    accountWarning: {
        backgroundColor: COLORS.warningLight,
        borderColor: COLORS.warning + '40',
    },
    accountDanger: {
        backgroundColor: COLORS.dangerLight,
        borderColor: COLORS.danger + '40',
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    accountDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    accountBalance: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    accountPercentage: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    lowBadge: {
        backgroundColor: COLORS.warning,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    lowBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.white,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSuccess: {
        backgroundColor: COLORS.successLight,
    },
    iconWarning: {
        backgroundColor: COLORS.warning + '20',
    },
    iconDanger: {
        backgroundColor: COLORS.danger + '20',
    },
    iconText: {
        fontSize: 16,
    },
    closeBottomButton: {
        margin: 20,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBottomButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
});
