import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import AppHeader from '../components/AppHeader';
import ConfirmModal from '../components/ConfirmModal';
import DropdownPicker, { DropdownOption } from '../components/DropdownPicker';
import { GcashAccount, GcashAccountService } from '../services/GcashAccountService';
import { TransactionService } from '../services/TransactionService';

type FundsTab = 'adjustment' | 'capital_move';

// ── Balance Adjustment Tab ──

function BalanceAdjustmentTab({ accounts }: { accounts: GcashAccount[] }) {
    const [target, setTarget] = useState<string | null>('cash');
    const [adjustmentType, setAdjustmentType] = useState<string | null>('add');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [amountFocused, setAmountFocused] = useState(false);
    const [remarksFocused, setRemarksFocused] = useState(false);

    // Success modal
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRef, setSuccessRef] = useState('');

    const targetOptions = useMemo<DropdownOption[]>(() => {
        const opts: DropdownOption[] = [
            { label: 'Cash on Hand', value: 'cash', icon: 'cash', iconColor: COLORS.warning },
        ];
        for (const acc of accounts) {
            opts.push({
                label: `GCash - ${acc.name}`,
                value: acc.id,
                icon: 'phone-portrait',
                iconColor: COLORS.primary,
            });
        }
        return opts;
    }, [accounts]);

    const typeOptions = useMemo<DropdownOption[]>(
        () => [
            { label: 'Add Balance', value: 'add', icon: 'add-circle', iconColor: COLORS.success },
            { label: 'Deduct Balance', value: 'deduct', icon: 'remove-circle', iconColor: COLORS.danger },
        ],
        [],
    );

    const canSubmit = target && adjustmentType && amount.trim() && parseFloat(amount) > 0 && remarks.trim();

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || submitting) return;
        Keyboard.dismiss();
        setSubmitting(true);

        try {
            const numAmount = parseFloat(amount);
            const finalAmount = adjustmentType === 'deduct' ? -numAmount : numAmount;

            const txn = await TransactionService.createAdjustment({
                accountType: target === 'cash' ? 'cash' : 'gcash',
                accountId: target === 'cash' ? undefined : target!,
                amount: finalAmount,
                reason: remarks.trim(),
            });

            setSuccessRef(txn.reference);
            setShowSuccess(true);

            // Reset form
            setAmount('');
            setRemarks('');
        } catch (error) {
            console.error('Adjustment error:', error);
        } finally {
            setSubmitting(false);
        }
    }, [canSubmit, submitting, amount, adjustmentType, target, remarks]);

    return (
        <>
            <ScrollView
                style={styles.tabScroll}
                contentContainerStyle={styles.tabScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Target */}
                <DropdownPicker
                    label="Target"
                    placeholder="Select target account"
                    options={targetOptions}
                    value={target}
                    onChange={setTarget}
                />

                {/* Adjustment Type */}
                <DropdownPicker
                    label="Adjustment Type"
                    placeholder="Select type"
                    options={typeOptions}
                    value={adjustmentType}
                    onChange={setAdjustmentType}
                />

                {/* Amount */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Amount</Text>
                    <View style={[styles.inputWrapper, amountFocused && styles.inputWrapperFocused]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter amount"
                            placeholderTextColor={COLORS.textTertiary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            onFocus={() => setAmountFocused(true)}
                            onBlur={() => setAmountFocused(false)}
                        />
                    </View>
                </View>

                {/* Remarks */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Remarks</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper, remarksFocused && styles.inputWrapperFocused]}>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Reason / notes (required)"
                            placeholderTextColor={COLORS.textTertiary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={remarks}
                            onChangeText={setRemarks}
                            onFocus={() => setRemarksFocused(true)}
                            onBlur={() => setRemarksFocused(false)}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleSubmit}
                    disabled={!canSubmit || submitting}
                >
                    {submitting ? (
                        <Text style={styles.submitBtnText}>Saving...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="wrench-outline" size={18} color={COLORS.white} />
                            <Text style={styles.submitBtnText}>Save Adjustment</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <ConfirmModal
                visible={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Adjustment Saved"
                message={`Balance adjustment has been recorded.\nRef: ${successRef}`}
                icon="checkmark-circle"
                iconColor={COLORS.success}
                options={[{ label: 'OK', variant: 'primary', onPress: () => { } }]}
            />
        </>
    );
}

// ── Capital Movement Tab ──

function CapitalMovementTab({ accounts }: { accounts: GcashAccount[] }) {
    const [from, setFrom] = useState<string | null>(null);
    const [to, setTo] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [amountFocused, setAmountFocused] = useState(false);
    const [refFocused, setRefFocused] = useState(false);
    const [remarksFocused, setRemarksFocused] = useState(false);

    // Success modal
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRef, setSuccessRef] = useState('');

    const accountOptions = useMemo<DropdownOption[]>(() => {
        const opts: DropdownOption[] = [
            { label: 'Cash on Hand', value: 'cash', icon: 'cash', iconColor: COLORS.warning },
        ];
        for (const acc of accounts) {
            opts.push({
                label: `GCash - ${acc.name}`,
                value: acc.id,
                icon: 'phone-portrait',
                iconColor: COLORS.primary,
            });
        }
        return opts;
    }, [accounts]);

    // Filter "To" options to exclude "From" selection and vice versa
    const fromOptions = useMemo(
        () => accountOptions.filter((o) => o.value !== to),
        [accountOptions, to],
    );
    const toOptions = useMemo(
        () => accountOptions.filter((o) => o.value !== from),
        [accountOptions, from],
    );

    const canSubmit = from && to && from !== to && amount.trim() && parseFloat(amount) > 0;

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || submitting) return;
        Keyboard.dismiss();
        setSubmitting(true);

        try {
            const numAmount = parseFloat(amount);
            const buildRemarks = remarks.trim()
                ? remarks.trim()
                : `Capital move${reference.trim() ? ` (Ref: ${reference.trim()})` : ''}`;

            const txn = await TransactionService.createCapitalMove({
                fromAccountId: from!,
                toAccountId: to!,
                amount: numAmount,
                remarks: buildRemarks,
            });

            setSuccessRef(txn.reference);
            setShowSuccess(true);

            // Reset form
            setFrom(null);
            setTo(null);
            setAmount('');
            setReference('');
            setRemarks('');
        } catch (error) {
            console.error('Capital move error:', error);
        } finally {
            setSubmitting(false);
        }
    }, [canSubmit, submitting, amount, from, to, reference, remarks]);

    return (
        <>
            <ScrollView
                style={styles.tabScroll}
                contentContainerStyle={styles.tabScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* From */}
                <DropdownPicker
                    label="From"
                    placeholder="Select source"
                    options={fromOptions}
                    value={from}
                    onChange={setFrom}
                />

                {/* To */}
                <DropdownPicker
                    label="To"
                    placeholder="Select destination"
                    options={toOptions}
                    value={to}
                    onChange={setTo}
                />

                {/* Amount */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Amount</Text>
                    <View style={[styles.inputWrapper, amountFocused && styles.inputWrapperFocused]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter amount"
                            placeholderTextColor={COLORS.textTertiary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            onFocus={() => setAmountFocused(true)}
                            onBlur={() => setAmountFocused(false)}
                        />
                    </View>
                </View>

                {/* Reference (optional) */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Reference (optional)</Text>
                    <View style={[styles.inputWrapper, refFocused && styles.inputWrapperFocused]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Transaction reference"
                            placeholderTextColor={COLORS.textTertiary}
                            value={reference}
                            onChangeText={setReference}
                            onFocus={() => setRefFocused(true)}
                            onBlur={() => setRefFocused(false)}
                        />
                    </View>
                </View>

                {/* Remarks (optional) */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Remarks (optional)</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper, remarksFocused && styles.inputWrapperFocused]}>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Additional notes"
                            placeholderTextColor={COLORS.textTertiary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={remarks}
                            onChangeText={setRemarks}
                            onFocus={() => setRemarksFocused(true)}
                            onBlur={() => setRemarksFocused(false)}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleSubmit}
                    disabled={!canSubmit || submitting}
                >
                    {submitting ? (
                        <Text style={styles.submitBtnText}>Processing...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="swap-horizontal" size={18} color={COLORS.white} />
                            <Text style={styles.submitBtnText}>Move Capital</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <ConfirmModal
                visible={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Capital Moved"
                message={`Funds have been transferred successfully.\nRef: ${successRef}`}
                icon="checkmark-circle"
                iconColor={COLORS.success}
                options={[{ label: 'OK', variant: 'primary', onPress: () => { } }]}
            />
        </>
    );
}

// ── Main Funds Screen ──

export default function FundsScreen() {
    const [activeTab, setActiveTab] = useState<FundsTab>('adjustment');
    const [accounts, setAccounts] = useState<GcashAccount[]>([]);

    useEffect(() => {
        const accs = GcashAccountService.getActiveAccounts();
        setAccounts(accs);
    }, []);

    return (
        <View style={styles.container}>
            <AppHeader />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Page Header */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Funds Management</Text>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'adjustment' && styles.tabActive]}
                        activeOpacity={0.7}
                        onPress={() => setActiveTab('adjustment')}
                    >
                        <Text style={[styles.tabText, activeTab === 'adjustment' && styles.tabTextActive]}>
                            Balance Adjustment
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'capital_move' && styles.tabActive]}
                        activeOpacity={0.7}
                        onPress={() => setActiveTab('capital_move')}
                    >
                        <Text style={[styles.tabText, activeTab === 'capital_move' && styles.tabTextActive]}>
                            Capital Movement
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {activeTab === 'adjustment' ? (
                    <BalanceAdjustmentTab accounts={accounts} />
                ) : (
                    <CapitalMovementTab accounts={accounts} />
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

// ── Styles ──

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    pageHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
        gap: 4,
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textTertiary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },

    // Tab content scroll
    tabScroll: {
        flex: 1,
    },
    tabScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 120,
    },

    // Form fields
    fieldGroup: {
        marginBottom: 18,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    inputWrapper: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
    },
    inputWrapperFocused: {
        borderColor: COLORS.primary,
    },
    textInput: {
        fontSize: 15,
        color: COLORS.textPrimary,
        height: 50,
        paddingVertical: 0,
    },
    textAreaWrapper: {
        height: undefined,
        paddingVertical: 12,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },

    // Submit button
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 8,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
});
