import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import TYPOGRAPHY from '../../constants/typography';

interface GCashAccount {
    id: string;
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
    onCashIn: (accountId: string) => void;
    onCashOut: (accountId: string) => void;
}

export default function GCashAccountsModal({
    visible,
    accounts,
    totalBalance,
    onClose,
    lastUpdated,
    onCashIn,
    onCashOut,
}: GCashAccountsModalProps) {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;

        slideAnim.setValue(0);
        backdropAnim.setValue(0);

        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
                damping: 22,
                stiffness: 210,
            }),
        ]).start();
    }, [backdropAnim, slideAnim, visible]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [420, 0],
    });

    const getAccountStyle = (status: GCashAccount['status']) => {
        switch (status) {
            case 'low':
                return {
                    container: styles.accountLow,
                    balance: styles.balanceLow,
                    pill: styles.lowBadge,
                    pillText: styles.lowBadgeText,
                    pillLabel: 'Low',
                    accent: COLORS.warning,
                    cashInBackground: '#FFF5D6',
                };
            case 'empty':
                return {
                    container: styles.accountEmpty,
                    balance: styles.balanceEmpty,
                    pill: styles.emptyBadge,
                    pillText: styles.emptyBadgeText,
                    pillLabel: 'Empty',
                    accent: COLORS.danger,
                    cashInBackground: '#FFEAE5',
                };
            default:
                return {
                    container: styles.accountActive,
                    balance: styles.balanceActive,
                    pill: null,
                    pillText: null,
                    pillLabel: '',
                    accent: COLORS.success,
                    cashInBackground: COLORS.successLight,
                };
        }
    };

    const handleAction = (type: 'cash_in' | 'cash_out', accountId: string) => {
        onClose();
        setTimeout(() => {
            if (type === 'cash_in') {
                onCashIn(accountId);
            } else {
                onCashOut(accountId);
            }
        }, 180);
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 0.42],
                            }),
                        },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>GCash Accounts</Text>
                            {lastUpdated ? <Text style={styles.subtitle}>Last updated: {lastUpdated}</Text> : null}
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.totalCard}>
                            <View>
                                <Text style={styles.totalLabel}>Total GCash Balance</Text>
                                <Text style={styles.totalMeta}>{accounts.length} active accounts</Text>
                            </View>
                            <Text style={styles.totalAmount}>P{totalBalance.toLocaleString()}</Text>
                        </View>

                        <View style={styles.accountsList}>
                            {accounts.map((account) => {
                                const accountStyle = getAccountStyle(account.status);

                                return (
                                    <View key={account.id} style={[styles.accountCard, accountStyle.container]}>
                                        <View style={styles.accountHeaderRow}>
                                            <View style={styles.accountHeaderLeft}>
                                                <Text style={styles.accountName}>{account.name}</Text>
                                                {accountStyle.pill ? (
                                                    <View style={accountStyle.pill}>
                                                        <Text style={accountStyle.pillText}>{accountStyle.pillLabel}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>

                                        <View style={styles.accountNumbersRow}>
                                            <Text style={[styles.accountBalance, accountStyle.balance]}>
                                                P{account.balance.toLocaleString()}
                                            </Text>
                                            <Text style={styles.accountPercentage}>{account.percentage.toFixed(1)}%</Text>
                                        </View>

                                        <View style={styles.actionsRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionButton,
                                                    styles.cashInButton,
                                                    { backgroundColor: accountStyle.cashInBackground },
                                                ]}
                                                activeOpacity={0.82}
                                                onPress={() => handleAction('cash_in', account.id)}
                                            >
                                                <Ionicons name="arrow-up-circle-outline" size={16} color={accountStyle.accent} />
                                                <Text style={[styles.actionButtonText, { color: accountStyle.accent }]}>Cash In</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.cashOutButton]}
                                                activeOpacity={0.82}
                                                onPress={() => handleAction('cash_out', account.id)}
                                            >
                                                <Ionicons name="arrow-down-circle-outline" size={16} color={COLORS.danger} />
                                                <Text style={[styles.actionButtonText, styles.cashOutButtonText]}>Cash Out</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <TouchableOpacity onPress={onClose} style={styles.closeBottomButton} activeOpacity={0.78}>
                        <Text style={styles.closeBottomButtonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.black,
    },
    sheet: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '88%',
        ...Platform.select({
            web: {
                width: '90%',
                maxWidth: 500,
                maxHeight: '80%',
                alignSelf: 'center',
                marginBottom: 24,
                borderRadius: 22,
            },
        }),
    },
    handle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 20,
        fontFamily: TYPOGRAPHY.bold,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        padding: 20,
    },
    totalCard: {
        backgroundColor: '#EEF1FF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    totalLabel: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.primary,
        marginBottom: 8,
    },
    totalMeta: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.primary,
    },
    totalAmount: {
        fontSize: 24,
        fontFamily: TYPOGRAPHY.extraBold,
        color: COLORS.primaryDark,
    },
    accountsList: {
        gap: 14,
    },
    accountCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 14,
    },
    accountActive: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.border,
    },
    accountLow: {
        backgroundColor: '#FFF9E8',
        borderColor: '#F5D97D',
    },
    accountEmpty: {
        backgroundColor: '#FFF4F2',
        borderColor: '#F5C0B6',
    },
    accountHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    accountHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    accountName: {
        fontSize: 17,
        fontFamily: TYPOGRAPHY.bold,
        color: COLORS.textPrimary,
    },
    accountNumbersRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    accountBalance: {
        fontSize: 18,
        fontFamily: TYPOGRAPHY.extraBold,
    },
    balanceActive: {
        color: COLORS.textPrimary,
    },
    balanceLow: {
        color: COLORS.warningDark,
    },
    balanceEmpty: {
        color: COLORS.dangerDark,
    },
    accountPercentage: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
    },
    lowBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#FFF1CC',
    },
    lowBadgeText: {
        fontSize: 11,
        fontFamily: TYPOGRAPHY.semibold,
        color: COLORS.warningDark,
    },
    emptyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#FFE2DB',
    },
    emptyBadgeText: {
        fontSize: 11,
        fontFamily: TYPOGRAPHY.semibold,
        color: COLORS.dangerDark,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        minHeight: 42,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 10,
    },
    cashInButton: {
        borderWidth: 1,
        borderColor: 'rgba(22, 163, 74, 0.14)',
    },
    cashOutButton: {
        backgroundColor: COLORS.dangerLight,
    },
    actionButtonText: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.semibold,
    },
    cashOutButtonText: {
        color: COLORS.danger,
    },
    closeBottomButton: {
        margin: 20,
        backgroundColor: '#F3F4F8',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBottomButtonText: {
        fontSize: 16,
        fontFamily: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
});

