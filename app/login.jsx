import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';

import { supabase } from '../src/lib/supabase';
import { palette, shadows } from '../utils/theme';

const InputField = memo(
  ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    error,
    keyboardType = 'default',
    autoCapitalize = 'none',
    rightIcon,
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={[styles.inputWrapper, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />

        {rightIcon ? (
          <TouchableOpacity onPress={rightIcon.onPress} style={styles.rightIcon}>
            {rightIcon.component}
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
);

export default function Login() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageType, setAuthMessageType] = useState('info');

  const validateEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Enter a valid email';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Minimum 6 characters';

    if (!isLogin) {
      if (!name.trim()) newErrors.name = 'Full name required';
      if (!confirmPassword) newErrors.confirmPassword = 'Confirm your password';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showAuthFeedback = (type, message) => {
    setAuthMessageType(type);
    setAuthMessage(message);
  };

  const handleAuth = async () => {
    setAuthMessage('');

    if (!validateForm()) {
      showAuthFeedback('error', 'Please fix the highlighted fields and try again.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          showAuthFeedback('error', error.message);
          Alert.alert('Login failed', error.message);
          return;
        }

        if (!data.session) {
          showAuthFeedback('error', 'Login succeeded, but no active session was returned.');
          Alert.alert('Login incomplete', 'No active session was returned after login.');
          return;
        }

        showAuthFeedback('success', 'Logged in successfully. Redirecting to your pantry...');
        router.replace('/');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });

      if (error) {
        showAuthFeedback('error', error.message);
        Alert.alert('Sign up failed', error.message);
        return;
      }

      const needsEmailConfirmation = !data.session;
      const successMessage = needsEmailConfirmation
        ? 'Account created. Check your email to confirm your account before logging in.'
        : 'Account created and signed in successfully. Redirecting to your pantry...';

      showAuthFeedback('success', successMessage);

      if (data.session) {
        router.replace('/');
        return;
      }

      setIsLogin(true);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong while contacting Supabase.';
      showAuthFeedback('error', message);
      Alert.alert(isLogin ? 'Login failed' : 'Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email || !validateEmail(email)) {
      Alert.alert('Error', 'Enter your email first');
      return;
    }

    Alert.alert('Reset Password', `Send reset email to ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (error) Alert.alert('Reset failed', error.message);
            else Alert.alert('Success', 'Reset email sent!');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.decorBlobOne} />
          <View style={styles.decorBlobTwo} />
          <View style={styles.decorRibbon} />

          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>GG</Text>
            </View>
            <Text style={styles.appTitle}>Got To Grocery</Text>
            <Text style={styles.appSubtitle}>Fresh groceries, organized pantry, less waste.</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.activeToggle]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.welcomeText}>
              {isLogin
                ? 'Welcome back. Pick up where your grocery planning left off.'
                : 'Create an account to track groceries, pantry items, and meal ideas.'}
            </Text>

            <View style={styles.formContainer}>
              {authMessage ? (
                <View
                  style={[
                    styles.authMessageBox,
                    authMessageType === 'error'
                      ? styles.authMessageError
                      : styles.authMessageSuccess,
                  ]}
                >
                  <Text style={styles.authMessageText}>{authMessage}</Text>
                </View>
              ) : null}

              {!isLogin ? (
                <InputField
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  error={errors.name}
                  autoCapitalize="words"
                />
              ) : null}

              <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
              />

              <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                error={errors.password}
                rightIcon={{
                  component: <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>,
                  onPress: () => setShowPassword(prev => !prev),
                }}
              />

              {!isLogin ? (
                <InputField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmPassword}
                  rightIcon={{
                    component: (
                      <Text style={styles.showHideText}>
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </Text>
                    ),
                    onPress: () => setShowConfirmPassword(prev => !prev),
                  }}
                />
              ) : null}

              {isLogin ? (
                <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.emailButton, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.emailButtonText}>
                    {isLogin ? 'Log In with Email' : 'Sign Up with Email'}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text>{' '}
                and acknowledge our <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>
          </View>

          {!isLogin ? (
            <TouchableOpacity style={styles.switchModeButton} onPress={() => setIsLogin(true)}>
              <Text style={styles.switchModeText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28 },
  content: { alignItems: 'center', position: 'relative', overflow: 'hidden' },
  decorBlobOne: {
    position: 'absolute',
    top: -18,
    right: -28,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: palette.peach,
    opacity: 0.45,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 120,
    left: -46,
    width: 136,
    height: 136,
    borderRadius: 999,
    backgroundColor: '#E2E9D7',
    opacity: 0.75,
  },
  decorRibbon: {
    position: 'absolute',
    top: 202,
    right: 18,
    width: 80,
    height: 12,
    borderRadius: 99,
    backgroundColor: palette.orangeSoft,
    opacity: 0.5,
  },
  logoContainer: { alignItems: 'center', marginTop: 18, marginBottom: 20 },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: palette.greenDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: palette.surface,
    marginBottom: 14,
    ...shadows.card,
  },
  logoIcon: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  appTitle: { fontSize: 34, fontWeight: '800', color: palette.greenDeep, marginBottom: 6 },
  appSubtitle: { fontSize: 16, color: palette.muted, textAlign: 'center' },
  panel: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  toggleButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10 },
  activeToggle: {
    backgroundColor: palette.greenDeep,
    borderWidth: 1,
    borderColor: palette.greenDeep,
  },
  toggleText: { fontSize: 16, color: palette.muted, fontWeight: '700' },
  activeToggleText: { color: '#fff', fontWeight: '800' },
  welcomeText: {
    fontSize: 17,
    color: palette.text,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  formContainer: { width: '100%' },
  authMessageBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    borderWidth: 1,
  },
  authMessageError: {
    backgroundColor: '#FBE6DD',
    borderColor: palette.danger,
  },
  authMessageSuccess: {
    backgroundColor: '#EEF5EA',
    borderColor: palette.success,
  },
  authMessageText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: palette.text, marginBottom: 8, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: palette.bg,
  },
  inputNormal: { borderColor: palette.border },
  inputError: { borderColor: palette.danger },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: palette.text },
  rightIcon: { paddingHorizontal: 16 },
  showHideText: { color: palette.greenDeep, fontSize: 14, fontWeight: '700' },
  errorText: { color: palette.danger, fontSize: 13, marginTop: 6, fontWeight: '600' },
  forgotPasswordButton: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, color: palette.peachDeep, fontWeight: '700' },
  emailButton: {
    backgroundColor: palette.orange,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  buttonDisabled: { opacity: 0.7 },
  emailButtonText: { fontSize: 17, color: '#fff', fontWeight: '800' },
  termsText: { fontSize: 13, color: palette.muted, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: palette.greenDeep, fontWeight: '700' },
  switchModeButton: { marginTop: 18, paddingVertical: 10 },
  switchModeText: { fontSize: 15, color: palette.greenDeep, fontWeight: '700' },
});
