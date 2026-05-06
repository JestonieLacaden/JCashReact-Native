import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Skeleton loading placeholder for the Transaction History screen.
 * Shows shimmer placeholders for search bar, action buttons, and transaction cards.
 */
export default function HistorySkeleton() {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.6],
    });

    return (
        <View style={styles.container}>
            {/* Toolbar row skeleton: search bar + icon circles */}
            <View style={styles.toolbarRow}>
                <Animated.View style={[styles.searchBar, { opacity }]} />
                <Animated.View style={[styles.iconCircle, { opacity }]} />
                <Animated.View style={[styles.iconCircle, { opacity }]} />
                <Animated.View style={[styles.iconCircle, { opacity }]} />
            </View>

            {/* Transaction card skeletons */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Animated.View key={i} style={[styles.card, { opacity }]}>
                    <View style={styles.cardRow}>
                        <View style={styles.cardBadge} />
                        <View style={styles.cardContent}>
                            <View style={styles.cardTitle} />
                            <View style={styles.cardSub} />
                        </View>
                        <View style={styles.cardAmount} />
                    </View>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    searchBar: {
        flex: 1,
        height: 44,
        backgroundColor: COLORS.border,
        borderRadius: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.border,
    },
    card: {
        height: 72,
        backgroundColor: COLORS.border,
        borderRadius: 12,
        marginBottom: 10,
        padding: 14,
        justifyContent: 'center',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardBadge: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        height: 14,
        width: '60%',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 4,
        marginBottom: 6,
    },
    cardSub: {
        height: 10,
        width: '40%',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 4,
    },
    cardAmount: {
        height: 16,
        width: 70,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 4,
    },
});
