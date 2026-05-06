import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import TYPOGRAPHY from '../../constants/typography';
import AppHeader from '../components/AppHeader';
import { FeeService } from '../services/FeeService';
import { GcashAccountService } from '../services/GcashAccountService';
import { TransactionService } from '../services/TransactionService';
import type { GcashAccount } from '../types';

// ─── Type dropdown options ───────────────────────────────────
type TransactionTypeOption = 'cash_in' | 'cash_out';

const TYPE_OPTIONS: { value: TransactionTypeOption; label: string }[] = [
    { value: 'cash_out', label: 'Cash Out' },
    { value: 'cash_in', label: 'Cash In' },
];

// ─── Props (optional initial type from route params) ─────────
interface Props {
    initialType?: TransactionTypeOption;
    initialAccountId?: string;
}

export default function NewTransactionScreen({ initialType, initialAccountId }: Props) {
    const router = useRouter();

    // ── Form state ──────────────────────────────────────────
    const [transactionType, setTransactionType] = useState<TransactionTypeOption>(
        initialType || 'cash_in',
    );
    const [showTypePicker, setShowTypePicker] = useState(false);

    // ── Track focused field for border highlight ────────
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [gcashAccounts, setGcashAccounts] = useState<GcashAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<GcashAccount | null>(null);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('0');
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ── Validation ──────────────────────────────────────────
    const [amountError, setAmountError] = useState('');
    const [accountError, setAccountError] = useState('');

    // ── Dropdown animation ──────────────────────────────────
    const [typeDropdownAnim] = useState(new Animated.Value(0));

    // ── Sync type when navigating from bottom sheet ────────
    useEffect(() => {
        if (initialType) {
            setTransactionType(initialType);
        }
    }, [initialType]);

    // ── Load GCash accounts on mount ────────────────────────
    useEffect(() => {
        loadGCashAccounts();
    }, [initialAccountId]);

    // ── Auto-calculate fee (tier-based) ─────────────────────
    useEffect(() => {
        if (amount && parseFloat(amount) > 0) {
            const computed = FeeService.computeFee(parseFloat(amount), isDiscounted);
            setFee(computed.toFixed(2));
        } else {
            setFee('0');
        }
    }, [amount, isDiscounted]);

    // ── Animate type dropdown ───────────────────────────────
    useEffect(() => {
        Animated.timing(typeDropdownAnim, {
            toValue: showTypePicker ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [showTypePicker]);

    const loadGCashAccounts = () => {
        if (Platform.OS === 'web') return;
        try {
            const accounts = GcashAccountService.getActiveAccounts();
            setGcashAccounts(accounts);
            if (accounts.length > 0) {
                const matchedAccount = initialAccountId
                    ? accounts.find((account) => account.id === initialAccountId)
                    : null;
                setSelectedAccount(matchedAccount || accounts[0]);
            }
        } catch (error) {
            console.error('Error loading GCash accounts:', error);
            Alert.alert('Error', 'Failed to load GCash accounts');
        }
    };

    // ── Validation helpers ──────────────────────────────────
    const validateAmount = (): boolean => {
        if (!amount || amount.trim() === '') {
            setAmountError('Amount is required');
            return false;
        }
        const n = parseFloat(amount);
        if (isNaN(n) || n <= 0) {
            setAmountError('Amount must be greater than 0');
            return false;
        }
        if (n > 1000000) {
            setAmountError('Amount is too large');
            return false;
        }
        setAmountError('');
        return true;
    };

    const validateAccount = (): boolean => {
        if (!selectedAccount) {
            setAccountError('Please select a GCash account');
            return false;
        }
        setAccountError('');
        return true;
    };

    // ── Submit ──────────────────────────────────────────────
    const handleSubmit = () => {
        const isAmountValid = validateAmount();
        const isAccountValid = validateAccount();
        if (!isAmountValid || !isAccountValid) return;

        const numAmount = parseFloat(amount);
        const numFee = parseFloat(fee);
        const typeLabel = transactionType === 'cash_in' ? 'Cash In' : 'Cash Out';

        const summaryLines = [
            `Type: ${typeLabel}`,
            `Amount: ₱${numAmount.toFixed(2)}`,
            `Fee: ₱${numFee.toFixed(2)}`,
            transactionType === 'cash_in'
                ? `Total: ₱${(numAmount + numFee).toFixed(2)}`
                : `Net: ₱${(numAmount - numFee).toFixed(2)}`,
            `\nAccount: ${selectedAccount?.name}`,
            customerName ? `Customer: ${customerName}` : '',
            customerPhone ? `Phone: ${customerPhone}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        Alert.alert('Confirm Transaction', `${summaryLines}\n\nProceed?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save Transaction', onPress: saveTransaction },
        ]);
    };

    const saveTransaction = async () => {
        if (!selectedAccount || Platform.OS === 'web') return;
        setIsLoading(true);

        try {
            const numAmount = parseFloat(amount);
            const numFee = parseFloat(fee);

            const payload = {
                gcashAccountId: selectedAccount.id,
                amount: numAmount,
                fee: numFee,
                discounted: isDiscounted,
                receiverName: customerName.trim() || undefined,
                customerPhone: customerPhone.trim() || undefined,
                remarks: remarks.trim() || undefined,
            };

            if (transactionType === 'cash_in') {
                await TransactionService.createCashIn(payload);
            } else {
                await TransactionService.createCashOut(payload);
            }

            setIsLoading(false);

            const typeLabel = transactionType === 'cash_in' ? 'Cash In' : 'Cash Out';
            Alert.alert('Success', `${typeLabel} completed successfully!`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            setIsLoading(false);
            console.error('Error saving transaction:', error);
            Alert.alert('Error', 'Failed to save transaction. Please try again.');
        }
    };

    // ── Helpers ─────────────────────────────────────────────
    const currentTypeLabel =
        TYPE_OPTIONS.find((o) => o.value === transactionType)?.label ?? 'Cash In';

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Global Header */}
            <AppHeader />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.pageTitle}>New Transaction</Text>

                {/* ── Type Dropdown (CustomSelect style) ──── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Type</Text>
                    <View style={{ zIndex: 10 }}>
                        <TouchableOpacity
                            style={[
                                styles.selectButton,
                                showTypePicker && styles.selectButtonFocused,
                            ]}
                            onPress={() => {
                                setShowTypePicker(!showTypePicker);
                                setShowAccountPicker(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.selectButtonText}>{currentTypeLabel}</Text>
                            <Text
                                style={[
                                    styles.selectArrow,
                                    showTypePicker && styles.selectArrowOpen,
                                ]}
                            >
                                ▾
                            </Text>
                        </TouchableOpacity>

                        {showTypePicker && (
                            <Animated.View style={[styles.dropdownList]}>
                                {TYPE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.dropdownItem,
                                            opt.value === transactionType &&
                                            styles.dropdownItemActive,
                                        ]}
                                        onPress={() => {
                                            setTransactionType(opt.value);
                                            setShowTypePicker(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                opt.value === transactionType &&
                                                styles.dropdownItemTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}
                    </View>
                </View>

                {/* ── GCash Account ──────────────────────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>GCash Account</Text>
                    <TouchableOpacity
                        style={[styles.selectButton, accountError ? styles.inputError : null]}
                        onPress={() => {
                            setShowAccountPicker(true);
                            setShowTypePicker(false);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={
                                selectedAccount
                                    ? styles.selectButtonText
                                    : styles.selectPlaceholder
                            }
                        >
                            {selectedAccount
                                ? `${selectedAccount.name} (${selectedAccount.number})`
                                : 'Select account'}
                        </Text>
                        <Text style={styles.selectArrow}>▾</Text>
                    </TouchableOpacity>
                    {accountError ? (
                        <Text style={styles.errorText}>{accountError}</Text>
                    ) : null}
                </View>

                {/* ── Customer Cellphone No. (optional) ──── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Customer Cellphone No. (optional)</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'phone' && styles.inputFocused]}
                        placeholder="09XX XXX XXXX"
                        placeholderTextColor="#9CA3AF"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="phone-pad"
                    />
                </View>

                {/* ── Customer Name (optional) ───────────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Customer Name (optional)</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                        placeholder="Juan Dela Cruz"
                        placeholderTextColor="#9CA3AF"
                        value={customerName}
                        onChangeText={setCustomerName}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                    />
                </View>

                {/* ── Amount ─────────────────────────────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'amount' && styles.inputFocused, amountError ? styles.inputError : null]}
                        placeholder="Enter amount"
                        placeholderTextColor="#9CA3AF"
                        value={amount}
                        onChangeText={(text) => {
                            setAmount(text);
                            if (amountError) setAmountError(''); // Clear error while typing
                        }}
                        onFocus={() => setFocusedField('amount')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="decimal-pad"
                    />
                    {amountError ? (
                        <Text style={styles.errorText}>{amountError}</Text>
                    ) : null}
                </View>

                {/* ── Fee (auto-calculated, editable) ────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Fee</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'fee' && styles.inputFocused]}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        value={fee}
                        onChangeText={setFee}
                        onFocus={() => setFocusedField('fee')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* ── Apply Discounted Fee ────────────────── */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setIsDiscounted(!isDiscounted)}
                    activeOpacity={0.7}
                >
                    <View
                        style={[styles.checkbox, isDiscounted && styles.checkboxChecked]}
                    >
                        {isDiscounted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Apply Discounted Fee</Text>
                </TouchableOpacity>

                {/* ── Reference (optional) ────────────────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Reference (optional)</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'reference' && styles.inputFocused]}
                        placeholder=""
                        placeholderTextColor="#9CA3AF"
                        value={reference}
                        onChangeText={setReference}
                        onFocus={() => setFocusedField('reference')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="characters"
                    />
                </View>

                {/* ── Remarks ─────────────────────────────── */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Remarks</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, focusedField === 'remarks' && styles.inputFocused]}
                        placeholder=""
                        placeholderTextColor="#9CA3AF"
                        value={remarks}
                        onChangeText={setRemarks}
                        onFocus={() => setFocusedField('remarks')}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* spacer so bottom bar doesn't overlap content */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Bottom bar: Cancel / Save ───────────────── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.7}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Transaction</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Account Picker Modal ────────────────────── */}
            {showAccountPicker && (
                <View style={styles.pickerOverlay}>
                    <TouchableOpacity
                        style={styles.pickerBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowAccountPicker(false)}
                    />
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select GCash Account</Text>
                            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                                <Text style={styles.pickerClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {gcashAccounts.map((account) => (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[
                                        styles.pickerItem,
                                        selectedAccount?.id === account.id &&
                                        styles.pickerItemSelected,
                                    ]}
                                    onPress={() => {
                                        setSelectedAccount(account);
                                        setShowAccountPicker(false);
                                        setAccountError('');
                                    }}
                                >
                                    <View>
                                        <Text style={styles.pickerItemName}>
                                            {account.name}
                                        </Text>
                                        <Text style={styles.pickerItemNumber}>
                                            {account.number}
                                        </Text>
                                    </View>
                                    <Text style={styles.pickerItemBadge}>{account.type}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

// ─── Styles (matching the Vue screenshots) ────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },

    pageTitle: {
        fontSize: 22,
        fontFamily: TYPOGRAPHY.bold,
        color: '#111827',
        marginBottom: 24,
    },

    /* Fields */
    fieldContainer: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.primary,
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: TYPOGRAPHY.regular,
        color: '#111827',
    },
    inputFocused: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },

    /* Custom Select (dropdown) */
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    selectButtonFocused: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    selectButtonText: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.regular,
        color: '#111827',
    },
    selectPlaceholder: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.regular,
        color: '#9CA3AF',
    },
    selectArrow: {
        fontSize: 14,
        color: '#6B7280',
    },
    selectArrowOpen: {
        transform: [{ rotate: '180deg' }],
    },

    /* Dropdown list */
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 50,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dropdownItemActive: {
        backgroundColor: '#EEF2FF',
    },
    dropdownItemText: {
        fontSize: 14,
        fontFamily: TYPOGRAPHY.regular,
        color: '#374151',
    },
    dropdownItemTextActive: {
        color: COLORS.primary,
        fontFamily: TYPOGRAPHY.semibold,
    },

    /* Checkbox */
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        fontFamily: TYPOGRAPHY.regular,
        color: '#374151',
    },

    /* Error */
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        fontFamily: TYPOGRAPHY.medium,
        marginTop: 4,
    },

    /* Bottom bar */
    bottomBar: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.semibold,
        color: '#374151',
    },
    saveButton: {
        flex: 1.5,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.semibold,
        color: '#fff',
    },

    /* Account Picker Modal */
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    pickerTitle: {
        fontSize: 17,
        fontFamily: TYPOGRAPHY.semibold,
        color: '#111827',
    },
    pickerClose: {
        fontSize: 22,
        color: '#6B7280',
    },
    pickerList: {
        maxHeight: 350,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    pickerItemSelected: {
        backgroundColor: '#EEF2FF',
    },
    pickerItemName: {
        fontSize: 15,
        fontFamily: TYPOGRAPHY.semibold,
        color: '#111827',
    },
    pickerItemNumber: {
        fontSize: 12,
        fontFamily: TYPOGRAPHY.regular,
        color: '#6B7280',
        marginTop: 2,
    },
    pickerItemBadge: {
        fontSize: 12,
        fontFamily: TYPOGRAPHY.medium,
        color: COLORS.primary,
        textTransform: 'capitalize',
    },
});

