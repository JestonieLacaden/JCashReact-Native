import React from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import COLORS from '../../constants/colors';
import AppHeader from '../../src/components/AppHeader';

export default function FundsScreen() {
    return (
        <View style={styles.container}>
            {/* App Header */}
            <AppHeader />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Page Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Funds Adjustment</Text>
                </View>

                {/* Content Placeholder */}
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>Funds adjustment will appear here</Text>
                    <Text style={styles.placeholderSubtext}>(Admin only)</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    placeholderContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    placeholderSubtext: {
        fontSize: 14,
        color: COLORS.textTertiary,
        textAlign: 'center',
    },
});
