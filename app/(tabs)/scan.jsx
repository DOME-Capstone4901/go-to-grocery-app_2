import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, shadows } from '../../utils/theme';

export default function Scan() {
  const [visible, setVisible] = useState(true);

  return (
    <View style={styles.container}>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.message}>
              Barcode scanning will be available once the Dev Client is enabled.
            </Text>

            <Pressable style={styles.button} onPress={() => setVisible(false)}>
              <Text style={styles.buttonText}>Okay</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Text style={styles.placeholderText}>Scan feature coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },
  placeholderText: {
    fontSize: 18,
    color: palette.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: palette.greenDeep,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: palette.text,
  },
  button: {
    backgroundColor: palette.orange,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});