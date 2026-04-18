import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '../../utils/theme';

const DOT_ID = 'dot-1';

/**
 * Single live tracker: tap the card or the blue map pin to load details. Stop / Move to freeze or resume.
 */
export default function MovingDotManager({ dots = [], onSelectDot, onStopDot, onResumeDot }) {
  const d = dots[0];
  if (!d) return null;

  const active = !!d.selected;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Live tracker</Text>
      <Text style={styles.sub}>
        Tap the blue pin on the map or the card below. Stop locks position and loads address + nearby
        stores.
      </Text>
      <View style={[styles.chipCol, active && styles.chipColActive]}>
        <Pressable
          onPress={() => onSelectDot?.(DOT_ID)}
          style={[styles.chip, active && styles.chipOn]}
          accessibilityRole="button"
          accessibilityLabel="Open location details for live tracker"
        >
          <View style={[styles.dotPreview, d.moving ? styles.dotMove : styles.dotStop]} />
          <Text style={[styles.chipLabel, active && styles.chipLabelOn]} numberOfLines={1}>
            {d.label || 'Live tracker'}
          </Text>
          <Text style={[styles.state, active && styles.stateOn]}>
            {d.moving ? 'Moving — tap to refresh location' : 'Stopped'}
          </Text>
        </Pressable>
        <View style={styles.actions}>
          {d.moving ? (
            <Pressable style={styles.stopBtn} onPress={() => onStopDot?.(DOT_ID)}>
              <Text style={styles.stopBtnText}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.resumeBtn} onPress={() => onResumeDot?.(DOT_ID)}>
              <Text style={styles.resumeBtnText}>Move</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800', color: palette.greenDeep },
  sub: { fontSize: 12, color: palette.muted, marginTop: 4, marginBottom: 10, lineHeight: 18 },
  chipCol: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  chipColActive: {
    borderColor: palette.greenDeep,
    borderWidth: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chipOn: {
    backgroundColor: palette.surface,
  },
  dotPreview: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  dotMove: { backgroundColor: '#4da3ff' },
  dotStop: { backgroundColor: '#0066cc' },
  chipLabel: { fontWeight: '800', fontSize: 14, color: palette.text },
  chipLabelOn: { color: palette.greenDeep },
  state: { fontSize: 11, color: palette.muted, marginTop: 4 },
  stateOn: { color: palette.text, fontWeight: '600' },
  actions: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  stopBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: palette.orange,
  },
  stopBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  resumeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: palette.greenDeep,
  },
  resumeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
