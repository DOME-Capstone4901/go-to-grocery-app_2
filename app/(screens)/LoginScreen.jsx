import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';

const { width } = Dimensions.get('window');

import { router } from 'expo-router';
const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login/signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = 'Full name is required';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login/signup
  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      
      if (isLogin) {
        // Simple login validation
        if (email === 'demo@email.com' && password === 'password123') {
          Alert.alert(
            'Success',
            'Logged in successfully!',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
          );
        } else {
          Alert.alert('Error', 'Invalid email or password');
        }
      } else {
        // Sign up
        Alert.alert(
          'Success',
          'Account created successfully!',
          [{ text: 'OK', onPress: () => {
            setIsLogin(true);
            setEmail('');
            setPassword('');
            setName('');
            setConfirmPassword('');
          }}]
        );
      }
    }, 1500);
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    if (!email || !validateEmail(email)) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to ${email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => {
          Alert.alert('Success', 'Password reset email sent!');
        }}
      ]
    );
  };

  // Clear errors when user starts typing
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Custom Input Component
  const InputField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    secureTextEntry, 
    error, 
    onFocus,
    keyboardType = 'default',
    autoCapitalize = 'none',
    rightIcon
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            clearError(label.toLowerCase());
          }}
          placeholder={placeholder}
          placeholderTextColor="#95A5A6"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!loading}
          onFocus={onFocus}
        />
        {rightIcon && (
          <TouchableOpacity onPress={rightIcon.onPress} style={styles.rightIcon}>
            {rightIcon.component}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.time}>9:56</Text>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Logo/Title Section */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🛒</Text>
              <Text style={styles.appTitle}>To Go Grocery</Text>
              <Text style={styles.appSubtitle}>Smart Shopping Companion</Text>
            </View>

            {/* Login/Signup Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, isLogin && styles.activeToggle]}
                onPress={() => setIsLogin(true)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                onPress={() => setIsLogin(false)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.welcomeText}>
              {isLogin ? 'Welcome back to healthy shopping!' : 'Join our healthy shopping community!'}
            </Text>
            
            {/* Thumbs up */}
            <View style={styles.thumbsContainer}>
              <Text style={styles.thumbs}>👍 👍 👍</Text>
              <Text style={styles.trustText}>Trusted by 500K+ shoppers</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {!isLogin && (
                <InputField
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  error={errors.name}
                  autoCapitalize="words"
                />
              )}

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
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                error={errors.password}
                rightIcon={{
                  component: <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>,
                  onPress: () => setShowPassword(!showPassword)
                }}
              />

              {!isLogin && (
                <InputField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmPassword}
                  rightIcon={{
                    component: <Text style={styles.showHideText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>,
                    onPress: () => setShowConfirmPassword(!showConfirmPassword)
                  }}
                />
              )}

              {/* Forgot Password Link */}
              {isLogin && (
                <TouchableOpacity 
                  style={styles.forgotPasswordButton}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Email Login/Signup Button */}
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.facebookButton, loading && styles.buttonDisabled]}
                  disabled={loading}
                >
                  <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.googleButton, loading && styles.buttonDisabled]}
                  disabled={loading}
                >
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>

              {/* Terms and Conditions */}
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>{' '}
                and acknowledge our{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            {/* Skip/Guest Option */}
            <TouchableOpacity 
              style={styles.skipOption}
              onPress={() => router.replace('/(tabs)/home')}
              disabled={loading}
            >
              <Text style={styles.skipText}>
                {isLogin ? 'Continue as guest →' : 'Already have an account? Log In'}
              </Text>
            </TouchableOpacity>

            {/* Demo Credentials Hint */}
            {isLogin && (
              <View style={styles.demoHint}>
                <Text style={styles.demoHintText}>
                  Demo: demo@email.com / password123
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  time: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 16,
    color: '#95A5A6',
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#27AE60',
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  thumbsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  thumbs: {
    fontSize: 40,
    marginBottom: 8,
  },
  trustText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
  },
  inputNormal: {
    borderColor: '#E9ECEF',
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3E50',
  },
  rightIcon: {
    paddingHorizontal: 16,
  },
  showHideText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  emailButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emailButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#95A5A6',
  },
  socialButtonsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  facebookButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },
  termsText: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#3498DB',
    fontWeight: '500',
  },
  skipOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#27AE60',
    fontWeight: '600',
  },
  demoHint: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  demoHintText: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});

export default LoginScreen;