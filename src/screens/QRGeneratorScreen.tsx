/**
 * QR GENERATOR SCREEN
 * 
 * Generates QR code with sync data (Admin only)
 * Other devices can scan this to receive updates
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../constants/colors';
import { QRSyncService } from '../services/QRSyncService';
import { TransactionService } from '../services/TransactionService';

export default function QRGeneratorScreen() {
    const router = useRouter();
    const [qrData, setQrData] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [qrSize, setQrSize] = useState(0);

    useEffect(() => {
        generateQR();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateQR = async () => {
        setIsGenerating(true);
        try {
            const unsynced = TransactionService.getUnsyncedTransactions();
            setUnsyncedCount(unsynced.length);

            if (unsynced.length === 0) {
                Alert.alert(
                    'No Data to Sync',
                    'All transactions are already synced. No new data to share.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            const data = await QRSyncService.generateSyncQR();
            setQrData(data);
            setQrSize(data.length);

            console.log(`QR generated: ${data.length} characters`);
        } catch (error) {
            console.error('Error generating QR:', error);
            Alert.alert('Error', 'Failed to generate QR code. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMarkAsSynced = () => {
        Alert.alert(
            'Mark as Synced',
            'Mark all current transactions as synced? This should only be done after the other device has scanned this QR code.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Synced',
                    style: 'default',
                    onPress: () => {
                        const unsynced = TransactionService.getUnsyncedTransactions();
                        const ids = unsynced.map(tx => tx.id);
                        TransactionService.markTransactionsAsSynced(ids);

                        Alert.alert('Success', 'Transactions marked as synced!', [
                            { text: 'OK', onPress: () => router.back() }
                        ]);
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* App Header */}
            <View style={styles.appHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.appHeaderTitle}>Generate QR Code</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {isGenerating ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Generating QR code...</Text>
                    </View>
                ) : qrData ? (
                    <>
                        {/* QR Code Display */}
                        <View style={styles.qrContainer}>
                            <View style={styles.qrWrapper}>
                                <QRCode
                                    value={qrData}
                                    size={280}
                                    backgroundColor={COLORS.white}
                                    color={COLORS.black}
                                />
                            </View>
                            <Text style={styles.qrLabel}>Scan this QR code with another device</Text>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsCard}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Transactions to Sync:</Text>
                                <Text style={styles.statValue}>{unsyncedCount}</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Data Size:</Text>
                                <Text style={styles.statValue}>{qrSize} chars</Text>
                            </View>
                        </View>

                        {/* Instructions */}
                        <View style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>📋 Instructions</Text>
                            <Text style={styles.instructionsText}>
                                {'1. Open the other device\'s JCash app\n'}
                                {'2. Go to Sync → Scan QR Code\n'}
                                {'3. Point camera at this QR code\n'}
                                {'4. Wait for sync to complete\n'}
                                {'5. Click "Mark as Synced" below'}
                            </Text>
                        </View>

                        {/* Actions */}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleMarkAsSynced}
                        >
                            <Text style={styles.primaryButtonText}>Mark as Synced</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={generateQR}
                        >
                            <Text style={styles.secondaryButtonText}>Regenerate QR</Text>
                        </TouchableOpacity>
                    </>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: COLORS.primary,
    },
    appHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    qrWrapper: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
        }),
    },
    qrLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    statsCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    instructionsCard: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    instructionsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    primaryButton: {
        backgroundColor: COLORS.success,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    secondaryButton: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
