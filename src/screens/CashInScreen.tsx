import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { FeeService } from '../services/FeeService';
import { GcashAccountService } from '../services/GcashAccountService';
import { TransactionService } from '../services/TransactionService';
import type { GcashAccount } from '../types';

export default function CashInScreen() {
    const router = useRouter();

    const [gcashAccounts, setGcashAccounts] = useState<GcashAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<GcashAccount | null>(null);
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('0');
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAccountPicker, setShowAccountPicker] = useState(false);

    // Validation errors
    const [amountError, setAmountError] = useState('');
    const [accountError, setAccountError] = useState('');

    // Load GCash accounts on mount
    useEffect(() => {
        loadGCashAccounts();
    }, []);

    // Auto-calculate fee when amount changes (tier-based from Vue system)
    useEffect(() => {
        if (amount && parseFloat(amount) > 0) {
            const computed = FeeService.computeFee(parseFloat(amount), isDiscounted);
            setFee(computed.toFixed(2));
        } else {
            setFee('0');
        }
    }, [amount, isDiscounted]);

    // Load GCash accounts from unified database
    const loadGCashAccounts = () => {
        if (Platform.OS === 'web') return;

        try {
            const accounts = GcashAccountService.getActiveAccounts();
            setGcashAccounts(accounts);
            if (accounts.length > 0) {
                setSelectedAccount(accounts[0]);
            }
        } catch (error) {
            console.error('Error loading GCash accounts:', error);
            Alert.alert('Error', 'Failed to load GCash accounts');
        }
    };

    // Validate amount
    const validateAmount = (): boolean => {
        if (!amount || amount.trim() === '') {
            setAmountError('Amount is required');
            return false;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setAmountError('Amount must be greater than 0');
            return false;
        }
        if (numAmount > 1000000) {
            setAmountError('Amount is too large');
            return false;
        }
        setAmountError('');
        return true;
    };

    // Validate account selection
    const validateAccount = (): boolean => {
        if (!selectedAccount) {
            setAccountError('Please select a GCash account');
            return false;
        }
        setAccountError('');
        return true;
    };

    // Handle form submission
    const handleSubmit = () => {
        const isAmountValid = validateAmount();
        const isAccountValid = validateAccount();

        if (!isAmountValid || !isAccountValid) {
            return;
        }

        // Show confirmation dialog
        const numAmount = parseFloat(amount);
        const numFee = parseFloat(fee);
        const totalAmount = numAmount + numFee;

        Alert.alert(
            'Confirm Cash In',
            `Amount: ₱${numAmount.toFixed(2)}\nFee: ₱${numFee.toFixed(2)}\nTotal: ₱${totalAmount.toFixed(2)}\n\nAccount: ${selectedAccount?.name}\n\nAre you sure you want to proceed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: saveCashIn },
            ]
        );
    };

    // Save cash in transaction via TransactionService
    const saveCashIn = async () => {
        if (!selectedAccount || Platform.OS === 'web') return;

        setIsLoading(true);

        try {
            const numAmount = parseFloat(amount);
            const numFee = parseFloat(fee);

            await TransactionService.createCashIn({
                gcashAccountId: selectedAccount.id,
                amount: numAmount,
                fee: numFee,
                discounted: isDiscounted,
                remarks: remarks.trim() || undefined,
            });

            setIsLoading(false);

            // Show success message
            Alert.alert(
                'Success',
                `Cash In completed successfully!\n\n₱${numAmount.toFixed(2)} added to ${selectedAccount.name}`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            setIsLoading(false);
            console.error('Error saving cash in:', error);
            Alert.alert('Error', 'Failed to save Cash In transaction. Please try again.');
        }
    };

    // Render account picker
    const renderAccountPicker = () => {
        if (!showAccountPicker) return null;

        return (
            <View style={styles.pickerOverlay}>
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
                                    selectedAccount?.id === account.id && styles.pickerItemSelected,
                                ]}
                                onPress={() => {
                                    setSelectedAccount(account);
                                    setShowAccountPicker(false);
                                    setAccountError('');
                                }}
                            >
                                <View>
                                    <Text style={styles.pickerItemName}>{account.name}</Text>
                                    <Text style={styles.pickerItemNumber}>{account.number}</Text>
                                </View>
                                <Text style={styles.pickerItemBalance}>
                                    {account.type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Cash In</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* GCash Account Selector */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>GCash Account *</Text>
                        <TouchableOpacity
                            style={[styles.accountSelector, accountError && styles.inputError]}
                            onPress={() => setShowAccountPicker(true)}
                        >
                            {selectedAccount ? (
                                <View style={styles.selectedAccount}>
                                    <View>
                                        <Text style={styles.selectedAccountName}>{selectedAccount.name}</Text>
                                        <Text style={styles.selectedAccountNumber}>{selectedAccount.number}</Text>
                                    </View>
                                    <Text style={styles.selectedAccountBalance}>
                                        {selectedAccount.type}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.placeholderText}>Select GCash Account</Text>
                            )}
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                        {accountError ? <Text style={styles.errorText}>{accountError}</Text> : null}
                    </View>

                    {/* Amount */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Amount *</Text>
                        <View style={styles.amountContainer}>
                            <Text style={styles.currencySymbol}>₱</Text>
                            <TextInput
                                style={[styles.amountInput, amountError && styles.inputError]}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                value={amount}
                                onChangeText={setAmount}
                                onBlur={validateAmount}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
                    </View>

                    {/* Discounted Checkbox */}
                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setIsDiscounted(!isDiscounted)}
                    >
                        <View style={[styles.checkbox, isDiscounted && styles.checkboxChecked]}>
                            {isDiscounted && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.checkboxLabel}>Discounted (₱10/₱1,000 instead of ₱15/₱1,000)</Text>
                    </TouchableOpacity>

                    {/* Fee */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Fee</Text>
                        <View style={styles.amountContainer}>
                            <Text style={styles.currencySymbol}>₱</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                value={fee}
                                onChangeText={setFee}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Reference */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Reference Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter reference number"
                            placeholderTextColor="#999"
                            value={reference}
                            onChangeText={setReference}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* Remarks */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Remarks (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add any notes..."
                            placeholderTextColor="#999"
                            value={remarks}
                            onChangeText={setRemarks}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Total Summary */}
                    {amount && parseFloat(amount) > 0 && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Amount:</Text>
                                <Text style={styles.summaryValue}>₱{parseFloat(amount).toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Fee:</Text>
                                <Text style={styles.summaryValue}>₱{parseFloat(fee).toFixed(2)}</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.summaryTotal]}>
                                <Text style={styles.totalLabel}>Total:</Text>
                                <Text style={styles.totalValue}>
                                    ₱{(parseFloat(amount) + parseFloat(fee)).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Complete Cash In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Account Picker Modal */}
            {renderAccountPicker()}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
    },
    header: {
        backgroundColor: '#fff',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginBottom: 12,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    form: {
        padding: 20,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1a1a1a',
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    accountSelector: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedAccount: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedAccountName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    selectedAccountNumber: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    selectedAccountBalance: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 6,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    checkmark: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
    },
    summaryCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
        marginTop: 4,
        marginBottom: 0,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34C759',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    submitButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
        backgroundColor: '#a3d4af',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    pickerClose: {
        fontSize: 24,
        color: '#666',
    },
    pickerList: {
        maxHeight: 400,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    pickerItemSelected: {
        backgroundColor: '#f0f8ff',
    },
    pickerItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    pickerItemNumber: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    pickerItemBalance: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
});
