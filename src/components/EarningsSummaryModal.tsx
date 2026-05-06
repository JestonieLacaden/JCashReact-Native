import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

export interface EarningsData {
    totalFees: number;
    cashInCount: number;
    cashOutCount: number;
    cashInTotal: number;
    cashOutTotal: number;
    adjustmentCount: number;
    capitalMoveCount: number;
    totalTransactions: number;
}

interface EarningsSummaryModalProps {
    visible: boolean;
    onClose: () => void;
    data: EarningsData;
    dateLabel: string; // e.g. "Today", "Yesterday", "Jan 1 – Jan 7"
}

export default function EarningsSummaryModal({
    visible,
    onClose,
    data,
    dateLabel,
}: EarningsSummaryModalProps) {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset before opening
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

    const formatCurrency = (amount: number) => {
        return `₱${Math.abs(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!visible) return null;

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 0],
    });

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

            {/* Content — slides from top */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + 12,
                        transform: [{ translateY }],
                    },
                ]}
            >
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Earnings Summary</Text>
                        <Text style={styles.dateLabel}>{dateLabel}</Text>
                    </View>
                    <Pressable onPress={onClose} hitSlop={12}>
                        <Ionicons name="close-circle" size={28} color={COLORS.textTertiary} />
                    </Pressable>
                </View>

                {/* Total Fees — Hero */}
                <View style={styles.heroCard}>
                    <Ionicons name="trending-up" size={24} color={COLORS.success} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.heroLabel}>Total Fees Collected</Text>
                        <Text style={styles.heroValue}>{formatCurrency(data.totalFees)}</Text>
                    </View>
                    <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{data.totalTransactions} txns</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {/* Cash In */}
                    <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
                        <Ionicons name="arrow-down-circle" size={20} color={COLORS.success} />
                        <Text style={[styles.statLabel, { color: COLORS.successDark }]}>Cash In</Text>
                        <Text style={[styles.statValue, { color: COLORS.successDark }]}>
                            {formatCurrency(data.cashInTotal)}
                        </Text>
                        <Text style={[styles.statCount, { color: COLORS.success }]}>
                            {data.cashInCount} transaction{data.cashInCount !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {/* Cash Out */}
                    <View style={[styles.statCard, { backgroundColor: COLORS.dangerLight }]}>
                        <Ionicons name="arrow-up-circle" size={20} color={COLORS.danger} />
                        <Text style={[styles.statLabel, { color: COLORS.dangerDark }]}>Cash Out</Text>
                        <Text style={[styles.statValue, { color: COLORS.dangerDark }]}>
                            {formatCurrency(data.cashOutTotal)}
                        </Text>
                        <Text style={[styles.statCount, { color: COLORS.danger }]}>
                            {data.cashOutCount} transaction{data.cashOutCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Counts Row */}
                <View style={styles.countsRow}>
                    <View style={styles.countItem}>
                        <View style={[styles.countDot, { backgroundColor: COLORS.purple }]} />
                        <Text style={styles.countLabel}>Capital Moves</Text>
                        <Text style={styles.countValue}>{data.capitalMoveCount}</Text>
                    </View>
                    <View style={styles.countDivider} />
                    <View style={styles.countItem}>
                        <View style={[styles.countDot, { backgroundColor: COLORS.info }]} />
                        <Text style={styles.countLabel}>Adjustments</Text>
                        <Text style={styles.countValue}>{data.adjustmentCount}</Text>
                    </View>
                </View>

                {/* Handle bar */}
                <View style={styles.handle} />
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
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    dateLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
    },
    heroLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    heroValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.success,
        marginTop: 2,
    },
    heroBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    heroBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    statValue: {
        fontSize: 17,
        fontWeight: '800',
    },
    statCount: {
        fontSize: 11,
        fontWeight: '500',
    },
    countsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    countItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    countLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    countValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    countDivider: {
        width: 1,
        height: 28,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginTop: 8,
    },
});
