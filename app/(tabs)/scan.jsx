import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';

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

      <Text style={styles.placeholderText}>
        Scan feature coming soon…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    width: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
