import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS } from '../../constants/colors';

interface FloatingActionButtonProps {
    visible?: boolean;
}

export default function FloatingActionButton({ visible = true }: FloatingActionButtonProps) {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(rotateAnim, {
                toValue: showMenu ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: showMenu ? 1 : 0,
                useNativeDriver: true,
                friction: 5,
            }),
        ]).start();
    }, [showMenu]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    const handleCashIn = () => {
        setShowMenu(false);
        router.push('/(tabs)/new-transaction?type=cash_in');
    };

    const handleCashOut = () => {
        setShowMenu(false);
        router.push('/(tabs)/new-transaction?type=cash_out');
    };

    if (!visible) return null;

    return (
        <>
            {/* Transparent dismiss area (no dark overlay) */}
            {showMenu && (
                <Pressable
                    style={styles.overlay}
                    onPress={() => setShowMenu(false)}
                />
            )}

            {/* FAB Container */}
            <View style={[styles.fabContainer, { bottom: Platform.OS === 'web' ? 24 : 80, right: 16 }]}>
                {/* Expandable Menu (appears above + button) */}
                {showMenu && (
                    <Animated.View style={[styles.menu, { transform: [{ scale: scaleAnim }] }]}>
                        {/* Cash Out Button */}
                        <TouchableOpacity
                            style={[styles.menuButton, { backgroundColor: COLORS.danger }]}
                            onPress={handleCashOut}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-down" size={20} color="white" />
                            <Text style={styles.menuButtonText}>Cash Out</Text>
                        </TouchableOpacity>

                        {/* Cash In Button */}
                        <TouchableOpacity
                            style={[styles.menuButton, { backgroundColor: COLORS.success }]}
                            onPress={handleCashIn}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-up" size={20} color="white" />
                            <Text style={styles.menuButtonText}>Cash In</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Main FAB Button */}
                <TouchableOpacity
                    style={styles.fabButton}
                    onPress={() => setShowMenu(!showMenu)}
                    activeOpacity={0.8}
                >
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        <Ionicons name="add" size={28} color="white" />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
    },
    fabContainer: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 50,
    },
    menu: {
        marginBottom: 12,
        flexDirection: 'column',
        gap: 8,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 10,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
            web: {
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            },
        }),
    },
    menuButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
    fabButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
            web: {
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            },
        }),
    },
});
