import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * TransactionSheet — Bottom sheet that slides up when the center tab button is pressed.
 * Shows Cash In / Cash Out action buttons.
 */
interface TransactionSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function TransactionSheet({ visible, onClose }: TransactionSheetProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset to initial values so animation always plays on re-open
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
                    damping: 20,
                    stiffness: 200,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleCashIn = () => {
        onClose();
        setTimeout(() => {
            router.push('/(tabs)/new-transaction?type=cash_in');
        }, 150);
    };

    const handleCashOut = () => {
        onClose();
        setTimeout(() => {
            router.push('/(tabs)/new-transaction?type=cash_out');
        }, 150);
    };

    if (!visible) return null;

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.sheetBackdrop,
                    { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet Content */}
            <Animated.View
                style={[
                    styles.sheetContainer,
                    {
                        paddingBottom: Math.max(insets.bottom, 16) + 16,
                        transform: [{ translateY }],
                    },
                ]}
            >
                {/* Handle bar */}
                <View style={styles.sheetHandle} />

                <Text style={styles.sheetTitle}>New Transaction</Text>

                <View style={styles.sheetActions}>
                    {/* Cash In — Send GCash to customer, receive cash */}
                    <TouchableOpacity
                        style={styles.sheetActionButton}
                        onPress={handleCashIn}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.sheetActionIcon, { backgroundColor: COLORS.successLight }]}>
                            <MaterialCommunityIcons name="cash-plus" size={28} color={COLORS.success} />
                        </View>
                        <Text style={styles.sheetActionLabel}>Cash In</Text>
                        <Text style={styles.sheetActionDesc}>GCash ➜ Customer</Text>
                        <Text style={styles.sheetActionSub}>+ Cash on Hand</Text>
                    </TouchableOpacity>

                    {/* Cash Out — Receive GCash from customer, give cash */}
                    <TouchableOpacity
                        style={styles.sheetActionButton}
                        onPress={handleCashOut}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.sheetActionIcon, { backgroundColor: COLORS.dangerLight }]}>
                            <MaterialCommunityIcons name="cash-minus" size={28} color={COLORS.danger} />
                        </View>
                        <Text style={styles.sheetActionLabel}>Cash Out</Text>
                        <Text style={styles.sheetActionDesc}>Customer ➜ GCash</Text>
                        <Text style={styles.sheetActionSub}>− Cash on Hand</Text>
                    </TouchableOpacity>
                </View>

                {/* Cancel */}
                <TouchableOpacity
                    style={styles.sheetCancelButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

/**
 * CenterTabButton — The raised diamond/circle button in the center of the tab bar.
 */
interface CenterTabButtonProps {
    onPress: () => void;
}

export function CenterTabButton({ onPress }: CenterTabButtonProps) {
    return (
        <TouchableOpacity
            style={styles.centerButtonWrapper}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={styles.centerButton}>
                <View style={styles.centerButtonIconWrap}>
                    <Ionicons name="swap-vertical" size={26} color={COLORS.white} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

/**
 * Legacy FloatingActionButton — kept for backward compatibility but now shows the sheet.
 */
interface FloatingActionButtonProps {
    visible?: boolean;
}

export default function FloatingActionButton({ visible = true }: FloatingActionButtonProps) {
    // This component is no longer used — the center tab button replaces it.
    // Kept as a no-op to prevent import errors.
    return null;
}

const styles = StyleSheet.create({
    // ── Bottom Sheet ──
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
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
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 24,
    },
    sheetActions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    sheetActionButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 12,
    },
    sheetActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    sheetActionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    sheetActionDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    sheetActionSub: {
        fontSize: 11,
        color: COLORS.textTertiary,
        marginTop: 2,
    },
    sheetCancelButton: {
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.background,
    },
    sheetCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },

    // ── Center Tab Button ──
    centerButtonWrapper: {
        top: -22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
        ...Platform.select({
            ios: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    centerButtonIconWrap: {
        transform: [{ rotate: '-45deg' }],
    },
});
