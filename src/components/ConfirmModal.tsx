import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface ConfirmOption {
    label: string;
    onPress: () => void;
    /** 'primary' = filled indigo, 'danger' = filled red, 'outline' = bordered gray */
    variant?: 'primary' | 'danger' | 'outline';
    icon?: string;
}

interface ConfirmModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message?: string;
    icon?: string;
    iconColor?: string;
    options: ConfirmOption[];
}

export default function ConfirmModal({
    visible,
    onClose,
    title,
    message,
    icon,
    iconColor,
    options,
}: ConfirmModalProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    damping: 18,
                    stiffness: 260,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!visible) return null;

    const scale = scaleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1],
    });

    const getButtonStyle = (variant?: string) => {
        switch (variant) {
            case 'danger':
                return styles.btnDanger;
            case 'outline':
                return styles.btnOutline;
            default:
                return styles.btnPrimary;
        }
    };

    const getButtonTextStyle = (variant?: string) => {
        switch (variant) {
            case 'danger':
                return styles.btnTextLight;
            case 'outline':
                return styles.btnTextOutline;
            default:
                return styles.btnTextLight;
        }
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    {
                        opacity: backdropAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.45],
                        }),
                    },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Dialog */}
            <View style={styles.center}>
                <Animated.View
                    style={[
                        styles.dialog,
                        { transform: [{ scale }], opacity: scaleAnim },
                    ]}
                >
                    {/* Icon Circle */}
                    {icon && (
                        <View style={[styles.iconCircle, { backgroundColor: (iconColor || COLORS.primary) + '15' }]}>
                            <Ionicons name={icon as any} size={28} color={iconColor || COLORS.primary} />
                        </View>
                    )}

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    {message && <Text style={styles.message}>{message}</Text>}

                    {/* Action Buttons */}
                    <View style={styles.buttonsContainer}>
                        {options.map((opt, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.btn, getButtonStyle(opt.variant)]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    onClose();
                                    // Small delay for close animation
                                    setTimeout(opt.onPress, 120);
                                }}
                            >
                                {opt.icon && (
                                    <Ionicons
                                        name={opt.icon as any}
                                        size={18}
                                        color={opt.variant === 'outline' ? COLORS.textSecondary : COLORS.white}
                                    />
                                )}
                                <Text style={getButtonTextStyle(opt.variant)}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    dialog: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingTop: 28,
        paddingBottom: 20,
        paddingHorizontal: 24,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 4,
    },
    buttonsContainer: {
        width: '100%',
        gap: 8,
        marginTop: 20,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 14,
    },
    btnPrimary: {
        backgroundColor: COLORS.primary,
    },
    btnDanger: {
        backgroundColor: COLORS.danger,
    },
    btnOutline: {
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    btnTextLight: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
    btnTextOutline: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
});
