import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGrocerySuggestions } from '../utils/groceryCatalog';
import { palette } from '../utils/theme';

function shouldHideGlobalSearch(pathname) {
  if (!pathname) return false;
  if (
    pathname === '/Search' ||
    pathname.endsWith('/Search') ||
    pathname.includes('Search')
  ) {
    return true;
  }
  if (
    pathname.includes('store-shop') ||
    pathname.includes('store-checkout') ||
    pathname.includes('store-orders')
  ) {
    return true;
  }
  return false;
}

export default function GlobalSearchBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  const suggestions = useMemo(
    () => getGrocerySuggestions(draft, 8),
    [draft]
  );

  if (shouldHideGlobalSearch(pathname)) {
    return null;
  }

  const goSearch = (q = '') => {
    Keyboard.dismiss();
    const trimmed = String(q).trim();
    if (trimmed) {
      router.push({ pathname: '/Search', params: { q: trimmed } });
    } else {
      router.push('/Search');
    }
    setDraft('');
  };

  const showSuggest = draft.trim().length > 0 && suggestions.length > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: showSuggest ? 6 : 10,
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="search-outline" size={20} color={palette.muted} style={styles.icon} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a letter — suggestions appear…"
          placeholderTextColor="#888"
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => goSearch(draft)}
        />
        <Pressable
          hitSlop={8}
          onPress={() => goSearch(draft)}
          style={({ pressed }) => [styles.goBtn, pressed && styles.goBtnPressed]}
        >
          <Text style={styles.goBtnLabel}>Search</Text>
        </Pressable>
      </View>

      {showSuggest ? (
        <View style={styles.suggestWrap}>
          <Text style={styles.suggestTitle}>Suggestions</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.suggestScroll}
            nestedScrollEnabled
          >
            {suggestions.map(item => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.suggestRow, pressed && styles.suggestRowPressed]}
                onPress={() => goSearch(item.name)}
              >
                <Text style={styles.suggestName}>{item.name}</Text>
                <Text style={styles.suggestCat}>{item.category}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.bg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: 14,
    zIndex: 20,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
  },
  icon: { marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: palette.text,
  },
  goBtn: {
    backgroundColor: palette.greenDeep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  goBtnPressed: {
    opacity: 0.88,
  },
  goBtnLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  suggestWrap: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.greenDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  suggestScroll: {
    maxHeight: 180,
  },
  suggestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  suggestRowPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  suggestName: {
    fontWeight: '700',
    color: palette.text,
    flex: 1,
    paddingRight: 8,
  },
  suggestCat: {
    fontSize: 12,
    color: palette.muted,
  },
});
