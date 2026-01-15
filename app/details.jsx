import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

export default function Details() {
  const { name, category, inCart, cartCount } = useLocalSearchParams()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name ?? 'Details'}</Text>
      <Text style={styles.subtitle}>Category: {category ?? '-'}</Text>
      {inCart && <Text style={styles.subtitle}>In list: {inCart}</Text>}
      {cartCount && <Text style={styles.subtitle}>List count: {cartCount}</Text>}

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#666' },
  button: { marginTop: 18, backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
