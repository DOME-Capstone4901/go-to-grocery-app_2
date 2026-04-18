import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { palette, shadows } from '../../utils/theme';

export default function DotDetailsCard({
  visible,
  onClose,
  loading,
  error,
  detail,
  title = 'Pin location',
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {loading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator color={palette.greenDeep} />
              <Text style={styles.muted}>Resolving address…</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {detail && !loading ? (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              <Row label="Latitude" value={String(detail.latitude)} />
              <Row label="Longitude" value={String(detail.longitude)} />
              <Row label="Area / locality" value={detail.locality || '—'} />
              <Row label="City" value={detail.city || '—'} />
              <Row label="Region / state" value={detail.state || '—'} />
              <Row label="Postal code" value={detail.postalCode || '—'} />
              <Row label="Country" value={detail.country || '—'} />
              <Row label="Street" value={detail.streetLine || '—'} />
              <View style={styles.block}>
                <Text style={styles.label}>Formatted</Text>
                <Text style={styles.valueMultiline}>{detail.formattedAddress || '—'}</Text>
              </View>
              {detail.source ? (
                <Text style={styles.sourceHint}>Source: {detail.source}</Text>
              ) : null}
            </ScrollView>
          ) : null}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: '72%',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginTop: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.greenDeep,
    marginBottom: 12,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  muted: { color: palette.muted },
  error: { color: '#b00020', marginBottom: 10, fontWeight: '600' },
  scroll: { maxHeight: 420 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  label: { fontSize: 12, fontWeight: '700', color: palette.muted, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '600', color: palette.text },
  valueMultiline: { fontSize: 14, color: palette.text, lineHeight: 20 },
  block: { paddingVertical: 10 },
  sourceHint: { fontSize: 11, color: palette.muted, marginTop: 8 },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: palette.greenDeep,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
