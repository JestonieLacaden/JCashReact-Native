import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import COLORS from '../../constants/colors';
import AppHeader from '../../src/components/AppHeader';
import { initializeDatabase, resetDatabase } from '../../src/database/database';

export default function SettingsScreen() {
    const [isResetting, setIsResetting] = useState(false);

    const handleResetDatabase = () => {
        Alert.alert(
            'Reset Database',
            'This will delete ALL data and create a fresh database with sample data. This action cannot be undone.\n\nAre you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await resetDatabase();
                            Alert.alert('Success', 'Database has been reset successfully!');
                        } catch (error) {
                            console.error('Reset error:', error);
                            Alert.alert('Error', 'Failed to reset database. Please try again.');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRebuildDatabase = () => {
        Alert.alert(
            'Rebuild Database',
            'This will run migrations to update your database schema without losing data.\n\nProceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Rebuild',
                    onPress: async () => {
                        try {
                            initializeDatabase();
                            Alert.alert('Success', 'Database has been rebuilt successfully!');
                        } catch (error) {
                            console.error('Rebuild error:', error);
                            Alert.alert('Error', 'Failed to rebuild database. You may need to reset it instead.');
                        }
                    },
                },
            ]
        );
    };

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
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>

                {/* Database Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Database Management</Text>
                    <Text style={styles.sectionDescription}>
                        Use these options if you're experiencing database errors or schema issues.
                    </Text>

                    {/* Rebuild Database Button */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleRebuildDatabase}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionButtonContent}>
                            <Text style={styles.actionButtonIcon}>🔄</Text>
                            <View style={styles.actionButtonText}>
                                <Text style={styles.actionButtonTitle}>Rebuild Database</Text>
                                <Text style={styles.actionButtonSubtitle}>
                                    Run migrations to fix schema issues
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Reset Database Button */}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleResetDatabase}
                        disabled={isResetting}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionButtonContent}>
                            <Text style={styles.actionButtonIcon}>⚠️</Text>
                            <View style={styles.actionButtonText}>
                                <Text style={[styles.actionButtonTitle, styles.dangerText]}>
                                    {isResetting ? 'Resetting...' : 'Reset Database'}
                                </Text>
                                <Text style={styles.actionButtonSubtitle}>
                                    Delete all data and start fresh
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* App Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Information</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Version</Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Platform</Text>
                        <Text style={styles.infoValue}>{Platform.OS}</Text>
                    </View>
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    actionButton: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
    dangerButton: {
        borderWidth: 1,
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    actionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtonIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    actionButtonText: {
        flex: 1,
    },
    actionButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    actionButtonSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    dangerText: {
        color: COLORS.danger,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
});
