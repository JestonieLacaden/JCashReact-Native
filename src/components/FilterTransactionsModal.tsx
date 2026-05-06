import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { GcashAccount } from '../services/GcashAccountService';

// ── Types ──
export type TransactionTypeFilter = 'all' | 'cash_in' | 'cash_out' | 'capital_move' | 'adjustment';

export type DatePreset =
    | 'today'
    | 'yesterday'
    | 'last_7'
    | 'last_30'
    | 'custom';

export interface FilterState {
    datePreset: DatePreset;
    customStartDate: string | null;
    customEndDate: string | null;
    transactionType: TransactionTypeFilter;
    accountId: string | null; // null = all accounts, 'cash_wallet' = cash wallet
}

interface FilterTransactionsModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;
    accounts: GcashAccount[];
    isAdmin: boolean;
}

// ── Defaults ──
export const DEFAULT_FILTERS: FilterState = {
    datePreset: 'today',
    customStartDate: null,
    customEndDate: null,
    transactionType: 'all',
    accountId: null,
};

// ── Date preset pills ──
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last_7', label: 'Last 7 days' },
    { key: 'last_30', label: 'Last 30 days' },
];

// ── Transaction type options (with proper icons) ──
const TYPE_OPTIONS: {
    key: TransactionTypeFilter;
    label: string;
    icon: string;
    iconSet: 'ion' | 'mci';
    color: string;
    adminOnly?: boolean;
}[] = [
        { key: 'all', label: 'All Types', icon: 'apps', iconSet: 'ion', color: COLORS.primary },
        { key: 'cash_in', label: 'Cash In', icon: 'arrow-down-circle', iconSet: 'ion', color: COLORS.success },
        { key: 'cash_out', label: 'Cash Out', icon: 'arrow-up-circle', iconSet: 'ion', color: COLORS.danger },
        { key: 'capital_move', label: 'Capital Move', icon: 'swap-horizontal', iconSet: 'mci', color: COLORS.purple, adminOnly: true },
        { key: 'adjustment', label: 'Adjustment', icon: 'wrench-outline', iconSet: 'mci', color: COLORS.info, adminOnly: true },
    ];

/** Format date to MM/DD/YYYY */
function formatDateInput(date: Date): string {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${m}/${d}/${y}`;
}

/** Get FROM/TO dates from a preset */
function getPresetDates(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
        case 'yesterday': {
            const yd = new Date(today);
            yd.setDate(yd.getDate() - 1);
            return { from: formatDateInput(yd), to: formatDateInput(yd) };
        }
        case 'last_7': {
            const s = new Date(today);
            s.setDate(s.getDate() - 6);
            return { from: formatDateInput(s), to: formatDateInput(today) };
        }
        case 'last_30': {
            const s = new Date(today);
            s.setDate(s.getDate() - 29);
            return { from: formatDateInput(s), to: formatDateInput(today) };
        }
        case 'today':
        default:
            return { from: formatDateInput(today), to: formatDateInput(today) };
    }
}

export default function FilterTransactionsModal({
    visible,
    onClose,
    onApply,
    currentFilters,
    accounts,
    isAdmin,
}: FilterTransactionsModalProps) {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Local state
    const [datePreset, setDatePreset] = useState<DatePreset>(currentFilters.datePreset);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [transactionType, setTransactionType] = useState<TransactionTypeFilter>(currentFilters.transactionType);
    const [accountId, setAccountId] = useState<string | null>(currentFilters.accountId);

    // Sync local state when modal opens
    useEffect(() => {
        if (visible) {
            setDatePreset(currentFilters.datePreset);
            setTransactionType(currentFilters.transactionType);
            setAccountId(currentFilters.accountId);

            // Set date fields
            if (currentFilters.datePreset === 'custom' && currentFilters.customStartDate && currentFilters.customEndDate) {
                setFromDate(currentFilters.customStartDate);
                setToDate(currentFilters.customEndDate);
            } else {
                const { from, to } = getPresetDates(currentFilters.datePreset);
                setFromDate(from);
                setToDate(to);
            }

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

    // When a preset is tapped, update the from/to fields
    const handlePresetTap = (preset: DatePreset) => {
        setDatePreset(preset);
        const { from, to } = getPresetDates(preset);
        setFromDate(from);
        setToDate(to);
    };

    const handleApply = () => {
        onApply({
            datePreset,
            customStartDate: fromDate || null,
            customEndDate: toDate || null,
            transactionType,
            accountId,
        });
        onClose();
    };

    const handleClear = () => {
        setDatePreset(DEFAULT_FILTERS.datePreset);
        setTransactionType(DEFAULT_FILTERS.transactionType);
        setAccountId(DEFAULT_FILTERS.accountId);
        const { from, to } = getPresetDates('today');
        setFromDate(from);
        setToDate(to);
    };

    if (!visible) return null;

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [500, 0],
    });

    const visibleTypes = TYPE_OPTIONS.filter((t) => !t.adminOnly || isAdmin);

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    {
                        opacity: backdropAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.4],
                        }),
                    },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet Content */}
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

                {/* Header */}
                <Text style={styles.title}>Filter Transactions</Text>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    style={{ maxHeight: 480 }}
                >
                    {/* ── Date Range ── */}
                    <Text style={styles.sectionLabel}>Date Range</Text>
                    <View style={styles.pillsRow}>
                        {DATE_PRESETS.map((preset) => {
                            const active = datePreset === preset.key;
                            return (
                                <TouchableOpacity
                                    key={preset.key}
                                    style={[styles.pill, active && styles.pillActive]}
                                    onPress={() => handlePresetTap(preset.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* FROM / TO date fields */}
                    <View style={styles.dateFieldsRow}>
                        <View style={styles.dateFieldContainer}>
                            <View style={styles.dateField}>
                                <TextInput
                                    style={styles.dateFieldInput}
                                    value={fromDate}
                                    onChangeText={(text) => {
                                        setFromDate(text);
                                        setDatePreset('custom');
                                    }}
                                    placeholder="MM/DD/YYYY"
                                    placeholderTextColor={COLORS.textTertiary}
                                    keyboardType="default"
                                />
                                <Ionicons name="calendar-outline" size={18} color={COLORS.textTertiary} />
                            </View>
                        </View>
                        <View style={styles.dateFieldContainer}>
                            <View style={styles.dateField}>
                                <TextInput
                                    style={styles.dateFieldInput}
                                    value={toDate}
                                    onChangeText={(text) => {
                                        setToDate(text);
                                        setDatePreset('custom');
                                    }}
                                    placeholder="MM/DD/YYYY"
                                    placeholderTextColor={COLORS.textTertiary}
                                    keyboardType="default"
                                />
                                <Ionicons name="calendar-outline" size={18} color={COLORS.textTertiary} />
                            </View>
                        </View>
                    </View>

                    {/* ── Transaction Type ── */}
                    <Text style={styles.sectionLabel}>Transaction Type</Text>
                    <View style={styles.typeGrid}>
                        {visibleTypes.map((type) => {
                            const active = transactionType === type.key;
                            const iconColor = active ? type.color : COLORS.textTertiary;
                            return (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[
                                        styles.typeChip,
                                        active && { backgroundColor: type.color + '18', borderColor: type.color },
                                    ]}
                                    onPress={() => setTransactionType(type.key)}
                                    activeOpacity={0.7}
                                >
                                    {type.iconSet === 'mci' ? (
                                        <MaterialCommunityIcons name={type.icon as any} size={16} color={iconColor} />
                                    ) : (
                                        <Ionicons name={type.icon as any} size={16} color={iconColor} />
                                    )}
                                    <Text
                                        style={[
                                            styles.typeChipText,
                                            active && { color: type.color, fontWeight: '700' },
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ── Account ── */}
                    <Text style={styles.sectionLabel}>Account</Text>
                    <View style={styles.typeGrid}>
                        {/* All Accounts */}
                        <TouchableOpacity
                            style={[
                                styles.typeChip,
                                accountId === null && {
                                    backgroundColor: COLORS.primary + '18',
                                    borderColor: COLORS.primary,
                                },
                            ]}
                            onPress={() => setAccountId(null)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="layers"
                                size={16}
                                color={accountId === null ? COLORS.primary : COLORS.textTertiary}
                            />
                            <Text
                                style={[
                                    styles.typeChipText,
                                    accountId === null && { color: COLORS.primary, fontWeight: '700' },
                                ]}
                            >
                                All Accounts
                            </Text>
                        </TouchableOpacity>

                        {/* Cash Wallet / Cash on Hand */}
                        <TouchableOpacity
                            style={[
                                styles.typeChip,
                                accountId === 'cash_wallet' && {
                                    backgroundColor: COLORS.warning + '18',
                                    borderColor: COLORS.warning,
                                },
                            ]}
                            onPress={() => setAccountId('cash_wallet')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="cash"
                                size={16}
                                color={accountId === 'cash_wallet' ? COLORS.warning : COLORS.textTertiary}
                            />
                            <Text
                                style={[
                                    styles.typeChipText,
                                    accountId === 'cash_wallet' && { color: COLORS.warning, fontWeight: '700' },
                                ]}
                            >
                                Cash on Hand
                            </Text>
                        </TouchableOpacity>

                        {/* GCash accounts */}
                        {accounts.map((acc) => {
                            const active = accountId === acc.id;
                            return (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={[
                                        styles.typeChip,
                                        active && {
                                            backgroundColor: COLORS.primary + '18',
                                            borderColor: COLORS.primary,
                                        },
                                    ]}
                                    onPress={() => setAccountId(acc.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="phone-portrait"
                                        size={16}
                                        color={active ? COLORS.primary : COLORS.textTertiary}
                                    />
                                    <Text
                                        style={[
                                            styles.typeChipText,
                                            active && { color: COLORS.primary, fontWeight: '700' },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {acc.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Bottom buttons: Clear + Apply */}
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.7}>
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                        <Text style={styles.applyText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
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
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 18,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    pillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    pillTextActive: {
        color: COLORS.white,
    },
    // Date FROM/TO
    dateFieldsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    dateFieldContainer: {
        flex: 1,
    },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        height: 44,
    },
    dateFieldInput: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    // Bottom buttons
    buttonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    clearButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    clearButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    applyButton: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    applyText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
});
