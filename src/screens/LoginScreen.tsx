import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
    const router = useRouter();
    const { login, loginWithGoogle, isAuthenticated, isLoading, error, clearError, loadUser } = useAuthStore();

    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailOrUsernameError, setEmailOrUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

    // Check if user is already logged in on mount
    useEffect(() => {
        const checkAuth = async () => {
            await loadUser();
        };
        checkAuth();
    }, []);

    // Navigate to home if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated]);

    // Show error alert when login fails
    useEffect(() => {
        if (error) {
            Alert.alert('Login Failed', error, [
                { text: 'OK', onPress: () => clearError() },
            ]);
        }
    }, [error]);

    // Validate email or username
    const validateEmailOrUsername = (text: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!text) {
            setEmailOrUsernameError('Email or Username is required');
            return false;
        }
        // Check if it's a valid email or just a username
        if (text.includes('@') && !emailRegex.test(text)) {
            setEmailOrUsernameError('Please enter a valid email or username');
            return false;
        }
        setEmailOrUsernameError('');
        return true;
    };

    // Validate password
    const validatePassword = (password: string): boolean => {
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return false;
        }
        setPasswordError('');
        return true;
    };

    // Handle login
    const handleLogin = async () => {
        // Clear previous errors
        clearError();

        // Validate inputs
        const isEmailOrUsernameValid = validateEmailOrUsername(emailOrUsername);
        const isPasswordValid = validatePassword(password);

        if (!isEmailOrUsernameValid || !isPasswordValid) {
            return;
        }

        try {
            await login(emailOrUsername.trim(), password);
            // Navigation is handled by useEffect watching isAuthenticated
        } catch (err) {
            // Error is handled by useEffect watching error state
            console.error('Login error:', err);
        }
    };

    const handleGoogleLogin = async () => {
        clearError();

        try {
            await loginWithGoogle();
        } catch (err) {
            console.error('Google login error:', err);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    {/* Logo and Brand */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/maskable-icon-512x512.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandName}>
                            <Text style={styles.brandJ}>J</Text>
                            <Text style={styles.brandCash}>Cash</Text>
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <TouchableOpacity
                            style={[
                                styles.googleButton,
                                isLoading && styles.loginButtonDisabled,
                            ]}
                            onPress={handleGoogleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <View style={styles.googleIcon}>
                                <Text style={styles.googleIconText}>G</Text>
                            </View>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or use local login</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Email/Username Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedInput === 'email' && styles.inputFocused,
                                    emailOrUsernameError ? styles.inputError : null,
                                ]}
                                placeholder="Username or Email Address"
                                placeholderTextColor={COLORS.textTertiary}
                                value={emailOrUsername}
                                onChangeText={(text) => {
                                    setEmailOrUsername(text);
                                    if (emailOrUsernameError) setEmailOrUsernameError('');
                                }}
                                onFocus={() => setFocusedInput('email')}
                                onBlur={() => setFocusedInput(null)}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                            {emailOrUsernameError ? (
                                <Text style={styles.errorText}>{emailOrUsernameError}</Text>
                            ) : null}
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.passwordInput,
                                        focusedInput === 'password' && styles.inputFocused,
                                        passwordError ? styles.inputError : null,
                                    ]}
                                    placeholder="Password"
                                    placeholderTextColor={COLORS.textTertiary}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (passwordError) setPasswordError('');
                                    }}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                            {passwordError ? (
                                <Text style={styles.errorText}>{passwordError}</Text>
                            ) : null}
                        </View>

                        {/* Remember Me */}
                        <TouchableOpacity
                            style={styles.rememberContainer}
                            onPress={() => setRememberMe(!rememberMe)}
                            disabled={isLoading}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={styles.rememberText}>Remember me</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                isLoading && styles.loginButtonDisabled,
                            ]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.loginButtonText}>Log In</Text>
                            )}
                        </TouchableOpacity>

                        {/* Forgot Password Link */}
                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => {
                                Alert.alert('Forgot Password', 'This feature is coming soon!');
                            }}
                            disabled={isLoading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgotten password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    content: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    brandName: {
        fontSize: 36,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    brandJ: {
        color: COLORS.primary,
    },
    brandCash: {
        color: COLORS.textPrimary,
    },
    form: {
        paddingHorizontal: 0,
    },
    googleButton: {
        minHeight: 52,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 18,
    },
    googleIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    googleIconText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    googleButtonText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        color: COLORS.textTertiary,
        fontSize: 12,
        marginHorizontal: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    inputFocused: {
        borderColor: COLORS.primary,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 48,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 4,
    },
    eyeIconText: {
        fontSize: 20,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    rememberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: -8,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 4,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    rememberText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    forgotPassword: {
        alignItems: 'center',
    },
    forgotPasswordText: {
        color: COLORS.primary,
        fontSize: 14,
    },
});
