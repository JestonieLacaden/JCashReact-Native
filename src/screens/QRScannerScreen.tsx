/**
 * QR SCANNER SCREEN
 * 
 * Scans QR code from another device and imports sync data
 */

import { BarCodeScanner } from 'expo-barcode-scanner';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { QRSyncService } from '../services/QRSyncService';

export default function QRScannerScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        requestCameraPermission();
    }, []);

    const requestCameraPermission = async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (scanned || isProcessing) return;

        setScanned(true);
        setIsProcessing(true);

        try {
            console.log('QR scanned, importing data...');
            const result = await QRSyncService.importFromQR(data);

            if (result.success) {
                Alert.alert(
                    'Sync Successful! ✅',
                    result.message + '\n\n' +
                    (result.stats ? `
• ${result.stats.transactions_imported} new transactions
• ${result.stats.accounts_updated} accounts updated
• ${result.stats.conflicts_resolved} conflicts resolved
                    `.trim() : ''),
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'Sync Failed ❌',
                    result.message,
                    [
                        {
                            text: 'Try Again',
                            onPress: () => {
                                setScanned(false);
                                setIsProcessing(false);
                            }
                        },
                        {
                            text: 'Cancel',
                            onPress: () => router.back(),
                            style: 'cancel'
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error processing QR:', error);
            Alert.alert(
                'Error',
                'Failed to process QR code. Please try again.',
                [
                    {
                        text: 'Try Again',
                        onPress: () => {
                            setScanned(false);
                            setIsProcessing(false);
                        }
                    },
                    {
                        text: 'Cancel',
                        onPress: () => router.back(),
                        style: 'cancel'
                    }
                ]
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>Requesting camera permission...</Text>
                </View>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <View style={styles.appHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.appHeaderTitle}>Scan QR Code</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.messageContainer}>
                    <Text style={styles.messageTitle}>Camera Permission Required</Text>
                    <Text style={styles.messageText}>
                        Please allow camera access to scan QR codes.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={requestCameraPermission}
                    >
                        <Text style={styles.primaryButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* App Header */}
            <View style={styles.appHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.appHeaderTitle}>Scan QR Code</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Camera Scanner */}
            <View style={styles.scannerContainer}>
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Scanning Frame */}
                <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>

                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                        {isProcessing ? 'Processing QR code...' :
                            scanned ? 'QR code scanned!' :
                                'Point camera at QR code'}
                    </Text>
                </View>
            </View>

            {/* Manual Reset Button */}
            {scanned && !isProcessing && (
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={() => setScanned(false)}
                    >
                        <Text style={styles.resetButtonText}>Scan Another QR</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.black,
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingBottom: 12,
        backgroundColor: COLORS.black,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: COLORS.white,
    },
    appHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
    },
    placeholder: {
        width: 40,
    },
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    scanFrame: {
        position: 'absolute',
        top: '25%',
        left: '10%',
        right: '10%',
        aspectRatio: 1,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: COLORS.white,
    },
    cornerTopLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    cornerTopRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    cornerBottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    cornerBottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    instructionsContainer: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructionsText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    messageTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.white,
        marginBottom: 12,
        textAlign: 'center',
    },
    messageText: {
        fontSize: 16,
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.8,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    resetButton: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
