import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { GcashAccount } from '../services/GcashAccountService';
import { Transaction } from '../services/TransactionService';

interface TransactionDetailModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    accounts: GcashAccount[]; // for resolving account names
}

// ── Helpers ──

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; iconSet: 'ion' | 'mci' }> = {
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
    const sign = amount >= 0 ? '' : '-';
    return `${sign}₱${Math.abs(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
    try {
        const d = new Date(iso);
        const dateStr = d.toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        return `${dateStr} at ${timeStr}`;
    } catch {
        return iso;
    }
}

export default function TransactionDetailModal({
    visible,
    onClose,
    transaction,
    accounts,
}: TransactionDetailModalProps) {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(0);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 220,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!visible || !transaction) return null;

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [500, 0],
    });

    const config = TYPE_CONFIG[transaction.type] || TYPE_CONFIG.cash_in;

    const getAccountName = (id?: string): string => {
        if (!id) return '—';
        if (id === 'cash_wallet') return 'Cash Wallet';
        const acc = accounts.find((a) => a.id === id);
        return acc ? acc.name : 'Unknown Account';
    };

    // ── Detail Row component ──
    const DetailRow = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        paddingBottom: Math.max(insets.bottom, 16) + 12,
                        transform: [{ translateY }],
                    },
                ]}
            >
                {/* Handle */}
                <View style={styles.handle} />

                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    {/* Type badge + close */}
                    <View style={styles.headerRow}>
                        <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                            {config.iconSet === 'mci' ? (
                                <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
                            ) : (
                                <Ionicons name={config.icon as any} size={22} color={config.color} />
                            )}
                            <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Ionicons name="close-circle" size={28} color={COLORS.textTertiary} />
                        </Pressable>
                    </View>

                    {/* Amount hero */}
                    <View style={styles.amountHero}>
                        <Text style={styles.amountLabel}>Amount</Text>
                        <Text style={[styles.amountValue, { color: config.color }]}>
                            {formatCurrency(transaction.amount)}
                        </Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Details */}
                    <DetailRow label="Reference" value={transaction.reference} />
                    <DetailRow label="Date & Time" value={formatDateTime(transaction.created_at)} />
                    <DetailRow label="Status" value={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)} />

                    {/* Type-specific details */}
                    {(transaction.type === 'cash_in' || transaction.type === 'cash_out') && (
                        <>
                            <View style={styles.sectionDivider} />
                            <Text style={styles.sectionTitle}>
                                {transaction.type === 'cash_in' ? 'Cash In Details' : 'Cash Out Details'}
                            </Text>
                            <DetailRow label="GCash Account" value={getAccountName(transaction.gcash_account_id)} />
                            {transaction.fee > 0 && (
                                <DetailRow
                                    label={transaction.discounted ? 'Fee (Discounted)' : 'Fee'}
                                    value={formatCurrency(transaction.fee)}
                                    valueColor={COLORS.warning}
                                />
                            )}
                            {transaction.receiver_name && (
                                <DetailRow label="Receiver Name" value={transaction.receiver_name} />
                            )}
                            {transaction.customer_phone && (
                                <DetailRow label="Customer Phone" value={transaction.customer_phone} />
                            )}
                        </>
                    )}

                    {transaction.type === 'capital_move' && (
                        <>
                            <View style={styles.sectionDivider} />
                            <Text style={styles.sectionTitle}>Transfer Details</Text>

                            {/* Visual transfer flow */}
                            <View style={styles.transferFlow}>
                                <View style={styles.transferNode}>
                                    <View style={[styles.transferIcon, { backgroundColor: COLORS.dangerLight }]}>
                                        <Ionicons name="arrow-up" size={18} color={COLORS.danger} />
                                    </View>
                                    <Text style={styles.transferNodeLabel}>From</Text>
                                    <Text style={styles.transferNodeName} numberOfLines={1}>
                                        {getAccountName(transaction.from_account_id)}
                                    </Text>
                                </View>

                                <Ionicons name="arrow-forward" size={20} color={COLORS.textTertiary} style={{ marginTop: 10 }} />

                                <View style={styles.transferNode}>
                                    <View style={[styles.transferIcon, { backgroundColor: COLORS.successLight }]}>
                                        <Ionicons name="arrow-down" size={18} color={COLORS.success} />
                                    </View>
                                    <Text style={styles.transferNodeLabel}>To</Text>
                                    <Text style={styles.transferNodeName} numberOfLines={1}>
                                        {getAccountName(transaction.to_account_id)}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {transaction.type === 'adjustment' && (
                        <>
                            <View style={styles.sectionDivider} />
                            <Text style={styles.sectionTitle}>Adjustment Details</Text>
                            {transaction.gcash_account_id ? (
                                <DetailRow label="Target Account" value={getAccountName(transaction.gcash_account_id)} />
                            ) : (
                                <DetailRow label="Target" value="Cash Wallet" />
                            )}
                            <DetailRow
                                label="Direction"
                                value={transaction.amount >= 0 ? 'Increase (+)' : 'Decrease (-)'}
                                valueColor={transaction.amount >= 0 ? COLORS.success : COLORS.danger}
                            />
                        </>
                    )}

                    {/* Remarks */}
                    {transaction.remarks && (
                        <>
                            <View style={styles.sectionDivider} />
                            <DetailRow label="Remarks" value={transaction.remarks} />
                        </>
                    )}

                    {/* Sync Status */}
                    <View style={styles.sectionDivider} />
                    <View style={styles.syncRow}>
                        <Ionicons
                            name={transaction.is_synced ? 'cloud-done' : 'cloud-offline'}
                            size={16}
                            color={transaction.is_synced ? COLORS.success : COLORS.warning}
                        />
                        <Text style={[styles.syncText, { color: transaction.is_synced ? COLORS.success : COLORS.warning }]}>
                            {transaction.is_synced ? 'Synced' : 'Not Synced'}
                        </Text>
                        {transaction.synced_at && (
                            <Text style={styles.syncDate}>
                                {formatDateTime(transaction.synced_at)}
                            </Text>
                        )}
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '85%',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    typeBadgeText: {
        fontSize: 15,
        fontWeight: '700',
    },
    amountHero: {
        alignItems: 'center',
        marginBottom: 20,
    },
    amountLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
    },
    detailLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flex: 1.2,
        textAlign: 'right',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
        marginTop: 4,
    },
    transferFlow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 8,
        marginBottom: 4,
    },
    transferNode: {
        flex: 1,
        alignItems: 'center',
    },
    transferIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    transferNodeLabel: {
        fontSize: 11,
        color: COLORS.textTertiary,
        fontWeight: '500',
    },
    transferNodeName: {
        fontSize: 13,
        color: COLORS.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    syncText: {
        fontSize: 13,
        fontWeight: '600',
    },
    syncDate: {
        fontSize: 11,
        color: COLORS.textTertiary,
        marginLeft: 'auto',
    },
});
