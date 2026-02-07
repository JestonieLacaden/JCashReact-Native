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
import { BalanceCalculator } from '../services/BalanceCalculator';
import { FeeService } from '../services/FeeService';
import { GcashAccountService } from '../services/GcashAccountService';
import { TransactionService } from '../services/TransactionService';
import type { GcashAccount } from '../types';

export default function CashOutScreen() {
    const router = useRouter();

    const [gcashAccounts, setGcashAccounts] = useState<GcashAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<GcashAccount | null>(null);
    const [cashWalletBalance, setCashWalletBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('0');
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [receiverName, setReceiverName] = useState('');
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAccountPicker, setShowAccountPicker] = useState(false);

    // Validation errors
    const [amountError, setAmountError] = useState('');
    const [accountError, setAccountError] = useState('');
    const [receiverError, setReceiverError] = useState('');

    // Load data on mount
    useEffect(() => {
        loadGCashAccounts();
        loadCashBalance();
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

    // Load cash wallet balance (calculated from transactions)
    const loadCashBalance = async () => {
        if (Platform.OS === 'web') return;

        try {
            const result = await BalanceCalculator.getCashBalance();
            setCashWalletBalance(result.balance);
        } catch (error) {
            console.error('Error loading cash balance:', error);
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

        // Check if cash wallet has sufficient balance
        const numFee = parseFloat(fee);
        const totalNeeded = numAmount - numFee; // For cash out, we receive amount but pay fee
        if (totalNeeded < 0) {
            setAmountError('Fee cannot be greater than amount');
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

    // Validate receiver name
    const validateReceiverName = (): boolean => {
        if (!receiverName || receiverName.trim() === '') {
            setReceiverError('Receiver name is required');
            return false;
        }
        if (receiverName.trim().length < 2) {
            setReceiverError('Receiver name is too short');
            return false;
        }
        setReceiverError('');
        return true;
    };

    // Handle form submission
    const handleSubmit = () => {
        const isAmountValid = validateAmount();
        const isAccountValid = validateAccount();
        const isReceiverValid = validateReceiverName();

        if (!isAmountValid || !isAccountValid || !isReceiverValid) {
            return;
        }

        const numAmount = parseFloat(amount);
        const numFee = parseFloat(fee);
        const netAmount = numAmount - numFee;

        // Show warning for large amounts
        if (numAmount > 50000) {
            Alert.alert(
                'Large Amount Warning',
                `You are about to cash out ₱${numAmount.toFixed(2)}. This is a large amount. Please verify the details carefully.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', onPress: () => showConfirmation(numAmount, numFee, netAmount) },
                ]
            );
        } else {
            showConfirmation(numAmount, numFee, netAmount);
        }
    };

    // Show confirmation dialog
    const showConfirmation = (numAmount: number, numFee: number, netAmount: number) => {
        Alert.alert(
            'Confirm Cash Out',
            `Amount: ₱${numAmount.toFixed(2)}\nFee: ₱${numFee.toFixed(2)}\nNet Amount: ₱${netAmount.toFixed(2)}\n\nFrom: ${selectedAccount?.name}\nTo: ${receiverName}\n\nAre you sure you want to proceed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: saveCashOut },
            ]
        );
    };

    // Save cash out transaction via TransactionService
    const saveCashOut = async () => {
        if (!selectedAccount || Platform.OS === 'web') return;

        setIsLoading(true);

        try {
            const numAmount = parseFloat(amount);
            const numFee = parseFloat(fee);
            const netAmount = numAmount - numFee;

            await TransactionService.createCashOut({
                gcashAccountId: selectedAccount.id,
                amount: numAmount,
                fee: numFee,
                discounted: isDiscounted,
                receiverName: receiverName.trim() || undefined,
                remarks: remarks.trim() || undefined,
            });

            setIsLoading(false);

            // Show success message
            Alert.alert(
                'Success',
                `Cash Out completed successfully!\n\n₱${netAmount.toFixed(2)} paid to ${receiverName}`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            setIsLoading(false);
            console.error('Error saving cash out:', error);
            Alert.alert('Error', 'Failed to save Cash Out transaction. Please try again.');
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

    const formatCurrency = (amount: number) => {
        return `₱${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
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
                    <Text style={styles.title}>Cash Out</Text>
                </View>

                {/* Current Wallet Balance */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Cash Wallet</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(cashWalletBalance)}</Text>
                    <Text style={styles.balanceSubtext}>Available Balance</Text>
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

                    {/* Receiver Name */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Receiver Name *</Text>
                        <TextInput
                            style={[styles.input, receiverError && styles.inputError]}
                            placeholder="Enter receiver's name"
                            placeholderTextColor="#999"
                            value={receiverName}
                            onChangeText={setReceiverName}
                            onBlur={validateReceiverName}
                            autoCapitalize="words"
                        />
                        {receiverError ? <Text style={styles.errorText}>{receiverError}</Text> : null}
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
                                <Text style={styles.summaryValue}>-₱{parseFloat(fee).toFixed(2)}</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.summaryTotal]}>
                                <Text style={styles.totalLabel}>Net Amount:</Text>
                                <Text style={styles.totalValue}>
                                    ₱{(parseFloat(amount) - parseFloat(fee)).toFixed(2)}
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
                            <Text style={styles.submitButtonText}>Complete Cash Out</Text>
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
    balanceCard: {
        backgroundColor: '#FF9500',
        margin: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    balanceSubtext: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    form: {
        padding: 20,
        paddingTop: 0,
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
        color: '#FF9500',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    submitButton: {
        backgroundColor: '#FF9500',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
        backgroundColor: '#ffc966',
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
        backgroundColor: '#fff8f0',
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
        color: '#FF9500',
    },
});
