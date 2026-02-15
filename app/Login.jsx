import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const USERS_KEY = 'demo_users_v1'
const SESSION_KEY = 'demo_session_v1'

async function loadUsers() {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

async function saveUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users))
}

async function loadSession() {
  try {
    const e = await AsyncStorage.getItem(SESSION_KEY)
    return e
  } catch (e) {
    return null
  }
}

async function saveSession(email) {
  if (!email) await AsyncStorage.removeItem(SESSION_KEY)
  else await AsyncStorage.setItem(SESSION_KEY, email)
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('signin')

  useEffect(() => {
    let mounted = true
    loadSession().then((e) => {
      if (mounted && e) {
        setUser({ email: e })
        // optional: navigate to home automatically
        router.replace('/')
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const signUp = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password')
    setLoading(true)
    const users = await loadUsers()
    if (users[email]) {
      setLoading(false)
      return Alert.alert('User exists', 'An account with this email already exists (demo).')
    }
    users[email] = { password }
    await saveUsers(users)
    await saveSession(email)
    setLoading(false)
    setUser({ email })
    router.replace('/')
  }

  const signIn = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password')
    setLoading(true)
    const users = await loadUsers()
    const record = users[email]
    if (!record || record.password !== password) {
      setLoading(false)
      return Alert.alert('Invalid', 'Email or password is incorrect (demo).')
    }
    await saveSession(email)
    setLoading(false)
    setUser({ email })
    router.replace('/')
  }

  const signOut = async () => {
    setLoading(true)
    await saveSession(null)
    setLoading(false)
    setUser(null)
    Alert.alert('Signed out')
  }

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Signed in</Text>
        <Text style={styles.info}>{user.email}</Text>
        <Pressable style={styles.btn} onPress={signOut}>
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Go-T-Grocery — Sign {mode === 'signin' ? 'In' : 'Up'}</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      <Pressable style={styles.btn} onPress={mode === 'signin' ? signIn : signUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>

      <Pressable onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}>
        <Text style={styles.switchText}>{mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  info: { textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  switchText: { color: '#333', textAlign: 'center' },
})
import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const USERS_KEY = 'demo_users_v1'
const SESSION_KEY = 'demo_session_v1'

async function loadUsers() {
	try {
		const raw = await AsyncStorage.getItem(USERS_KEY)
		return raw ? JSON.parse(raw) : {}
	} catch (e) {
		return {}
	}
}

async function saveUsers(users) {
	await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users))
}

async function loadSession() {
	try {
		const e = await AsyncStorage.getItem(SESSION_KEY)
		return e
	} catch (e) {
		return null
	}
}

async function saveSession(email) {
	if (!email) await AsyncStorage.removeItem(SESSION_KEY)
	else await AsyncStorage.setItem(SESSION_KEY, email)
}

export default function Login() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [user, setUser] = useState(null)
	const [mode, setMode] = useState('signin')

	useEffect(() => {
		let mounted = true
		loadSession().then((e) => {
			if (mounted && e) {
				setUser({ email: e })
				// optional: navigate to home automatically
				router.replace('/')
			}
		})
		return () => {
			mounted = false
		}
	}, [])

	const signUp = async () => {
		if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password')
		setLoading(true)
		const users = await loadUsers()
		if (users[email]) {
			setLoading(false)
			return Alert.alert('User exists', 'An account with this email already exists (demo).')
		}
		users[email] = { password }
		await saveUsers(users)
		await saveSession(email)
		setLoading(false)
		setUser({ email })
		router.replace('/')
	}

	const signIn = async () => {
		if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password')
		setLoading(true)
		const users = await loadUsers()
		const record = users[email]
		if (!record || record.password !== password) {
			setLoading(false)
			return Alert.alert('Invalid', 'Email or password is incorrect (demo).')
		}
		await saveSession(email)
		setLoading(false)
		setUser({ email })
		router.replace('/')
	}

	const signOut = async () => {
		setLoading(true)
		await saveSession(null)
		setLoading(false)
		setUser(null)
		Alert.alert('Signed out')
	}

	if (user) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Signed in</Text>
				<Text style={styles.info}>{user.email}</Text>
				<Pressable style={styles.btn} onPress={signOut}>
					<Text style={styles.btnText}>Sign out</Text>
				</Pressable>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Go-T-Grocery — Sign {mode === 'signin' ? 'In' : 'Up'}</Text>

			<TextInput
				value={email}
				onChangeText={setEmail}
				placeholder="Email"
				keyboardType="email-address"
				autoCapitalize="none"
				style={styles.input}
			/>

			<TextInput
				value={password}
				onChangeText={setPassword}
				placeholder="Password"
				secureTextEntry
				style={styles.input}
			/>

			<Pressable style={styles.btn} onPress={mode === 'signin' ? signIn : signUp} disabled={loading}>
				{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>}
			</Pressable>

			<Pressable onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}>
				<Text style={styles.switchText}>{mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
	title: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
	info: { textAlign: 'center', marginBottom: 20 },
	input: {
		backgroundColor: '#fff',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		marginBottom: 12,
	},
	btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
	btnText: { color: '#fff', fontWeight: '700' },
	switchText: { color: '#333', textAlign: 'center' },
})

