import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface DropdownOption {
    label: string;
    value: string;
    icon?: string;
    iconColor?: string;
}

interface DropdownPickerProps {
    label: string;
    placeholder?: string;
    options: DropdownOption[];
    value: string | null;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function DropdownPicker({
    label,
    placeholder = 'Select an option',
    options,
    value,
    onChange,
    disabled,
}: DropdownPickerProps) {
    const [open, setOpen] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const selectedOption = options.find((o) => o.value === value);

    const handleOpen = () => {
        if (disabled) return;
        setOpen(true);
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
                damping: 20,
                stiffness: 260,
            }),
        ]).start();
    };

    const handleClose = () => {
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
        ]).start(() => setOpen(false));
    };

    const handleSelect = (option: DropdownOption) => {
        onChange(option.value);
        handleClose();
    };

    return (
        <View style={styles.wrapper}>
            {/* Label */}
            <Text style={styles.label}>{label}</Text>

            {/* Trigger */}
            <TouchableOpacity
                style={[
                    styles.trigger,
                    open && styles.triggerFocused,
                    disabled && styles.triggerDisabled,
                ]}
                activeOpacity={0.7}
                onPress={handleOpen}
            >
                <Text
                    style={[
                        styles.triggerText,
                        !selectedOption && styles.triggerPlaceholder,
                    ]}
                    numberOfLines={1}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.textTertiary}
                />
            </TouchableOpacity>

            {/* Dropdown Modal */}
            {open && (
                <Modal transparent visible={open} animationType="none" statusBarTranslucent>
                    {/* Backdrop */}
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.35],
                                }),
                            },
                        ]}
                    >
                        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                    </Animated.View>

                    {/* Options sheet */}
                    <View style={styles.sheetCenter}>
                        <Animated.View
                            style={[
                                styles.sheet,
                                {
                                    transform: [
                                        {
                                            scale: scaleAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.9, 1],
                                            }),
                                        },
                                    ],
                                    opacity: scaleAnim,
                                },
                            ]}
                        >
                            <Text style={styles.sheetTitle}>{label}</Text>
                            <FlatList
                                data={options}
                                keyExtractor={(item) => item.value}
                                bounces={false}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => {
                                    const selected = item.value === value;
                                    return (
                                        <TouchableOpacity
                                            style={[styles.option, selected && styles.optionSelected]}
                                            activeOpacity={0.7}
                                            onPress={() => handleSelect(item)}
                                        >
                                            {item.icon && (
                                                <View
                                                    style={[
                                                        styles.optionIcon,
                                                        { backgroundColor: (item.iconColor || COLORS.primary) + '14' },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={item.icon as any}
                                                        size={16}
                                                        color={item.iconColor || COLORS.primary}
                                                    />
                                                </View>
                                            )}
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    selected && styles.optionTextSelected,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                            {selected && (
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                ItemSeparatorComponent={() => <View style={styles.separator} />}
                            />
                        </Animated.View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        height: 50,
    },
    triggerFocused: {
        borderColor: COLORS.primary,
    },
    triggerDisabled: {
        opacity: 0.5,
    },
    triggerText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    triggerPlaceholder: {
        color: COLORS.textTertiary,
        fontWeight: '400',
    },
    // Modal
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    sheetCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    sheet: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingTop: 20,
        paddingBottom: 8,
        paddingHorizontal: 6,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    sheetTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
        paddingHorizontal: 14,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 12,
    },
    optionSelected: {
        backgroundColor: COLORS.primary + '0A',
    },
    optionIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 14,
    },
});
