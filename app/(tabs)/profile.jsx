import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '../../src/lib/supabase';
import { palette, shadows } from '../../utils/theme';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState({
    email: '',
    fullName: '',
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        router.replace('/login');
        return;
      }

      setProfile({
        email: session.user.email || '',
        fullName: session.user.user_metadata?.full_name || '',
      });
      setLoading(false);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert('Logout failed', error.message);
        return;
      }

      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={palette.greenDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />

      <View style={styles.heroCard}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>
            {(profile.fullName || profile.email || 'G').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account and session settings.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{profile.fullName || 'Not set yet'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email || 'No email found'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About This App</Text>
        <Text style={styles.aboutText}>
          Keep groceries organized, track pantry items, and reduce food waste with a simple routine.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.logoutButtonText}>Log Out</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: palette.bg,
    position: 'relative',
    gap: 18,
  },
  decorBlobOne: {
    position: 'absolute',
    top: -26,
    right: -26,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: palette.peach,
    opacity: 0.35,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 140,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#E2E9D7',
    opacity: 0.4,
  },
  heroCard: {
    backgroundColor: '#F7EFE6',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    ...shadows.card,
  },
  avatarBadge: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: palette.greenDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.greenDeep,
    marginBottom: 14,
  },
  infoRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  logoutButton: {
    backgroundColor: palette.orange,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  logoutButtonDisabled: {
    opacity: 0.75,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
});
