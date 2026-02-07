import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import COLORS from '../../constants/colors';

export default function DashboardSkeleton() {
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
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
            ])
        ).start();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <View style={styles.container}>
            {/* Top Row */}
            <View style={styles.topRow}>
                <Animated.View style={[styles.topCard, { opacity }]} />
                <Animated.View style={[styles.topCard, { opacity }]} />
            </View>

            {/* Bottom Cards */}
            <Animated.View style={[styles.bottomCard, { opacity }]} />
            <Animated.View style={[styles.bottomCard, { opacity }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        maxWidth: 672, // max-w-2xl (42rem)
        width: '100%',
        alignSelf: 'center',
    },
    topRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    topCard: {
        flex: 1,
        height: 80,
        backgroundColor: COLORS.border,
        borderRadius: 12,
    },
    bottomCard: {
        height: 80,
        backgroundColor: COLORS.border,
        borderRadius: 12,
        marginBottom: 16,
    },
});
