import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "PANTRY_ITEMS_V1";

function parseDateYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function daysFromNow(dateObj) {
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Mini() {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [expiry, setExpiry] = useState(""); // YYYY-MM-DD
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch (e) {
        // Don’t crash; just start empty
        console.log("Pantry load error:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save whenever items change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.log("Pantry save error:", e);
      }
    })();
  }, [items, loaded]);

  const sortedFilteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = items;
    if (q) {
      list = list.filter((x) => {
        const hay = `${x.name} ${x.expiry}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      const da = parseDateYYYYMMDD(a.expiry);
      const db = parseDateYYYYMMDD(b.expiry);
      if (!da && !db) return a.name.localeCompare(b.name);
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }, [items, search]);

  const addItem = () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Missing name", "Enter an item name.");

    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      return Alert.alert("Invalid quantity", "Quantity must be a number > 0.");
    }

    const dt = parseDateYYYYMMDD(expiry.trim());
    if (!dt) {
      return Alert.alert("Invalid expiry", "Use YYYY-MM-DD (example: 2026-03-10).");
    }

    const newItem = {
      id: String(Date.now()),
      name: trimmed,
      qty: q,
      expiry: expiry.trim(),
    };

    setItems((prev) => [newItem, ...prev]);
    setName("");
    setQty("1");
    setExpiry("");
    Keyboard.dismiss();
  };

  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((x) => {
          if (x.id !== id) return x;
          const next = Math.max(0, Number(x.qty || 0) + delta);
          return { ...x, qty: next };
        })
        .filter((x) => x.qty > 0) // if qty becomes 0, remove item
    );
  };

  const clearAll = () => {
    Alert.alert("Clear pantry?", "This will delete all pantry items.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setItems([]) },
    ]);
  };

  const renderRow = ({ item }) => {
    const dt = parseDateYYYYMMDD(item.expiry);
    const daysLeft = dt ? daysFromNow(dt) : null;

    let badgeText = "";
    let badgeStyle = styles.badgeOk;

    if (daysLeft === null) {
      badgeText = "No date";
      badgeStyle = styles.badgeNeutral;
    } else if (daysLeft < 0) {
      badgeText = "Expired";
      badgeStyle = styles.badgeBad;
    } else if (daysLeft <= 3) {
      badgeText = `Soon (${daysLeft}d)`;
      badgeStyle = styles.badgeWarn;
    } else {
      badgeText = `${daysLeft}d`;
      badgeStyle = styles.badgeOk;
    }

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowSub}>
            Exp: {item.expiry} • Qty: {item.qty}
          </Text>
        </View>

        <View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>

        <View style={styles.qtyBox}>
          <Pressable style={styles.qtyBtn} onPress={() => changeQty(item.id, -1)}>
            <Text style={styles.qtyBtnText}>-</Text>
          </Pressable>
          <Text style={styles.qtyNum}>{item.qty}</Text>
          <Pressable style={styles.qtyBtn} onPress={() => changeQty(item.id, +1)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.header}>Pantry</Text>
            <Text style={styles.subheader}>Search • add • edit qty • saved automatically</Text>
          </View>

          <Pressable style={styles.clearBtn} onPress={clearAll}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search pantry (milk, 2026-03...)"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Add Form */}
        <View style={styles.card}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Item name (e.g., Rice)"
            style={styles.input}
          />

          <View style={styles.rowInputs}>
            <TextInput
              value={qty}
              onChangeText={setQty}
              placeholder="Qty"
              keyboardType="numeric"
              style={[styles.input, styles.inputSmall]}
            />
            <TextInput
              value={expiry}
              onChangeText={setExpiry}
              placeholder="Expiry (YYYY-MM-DD)"
              style={[styles.input, styles.inputBig]}
              autoCapitalize="none"
            />
          </View>

          <Pressable onPress={addItem} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Add to Pantry</Text>
          </Pressable>

          <Text style={styles.hint}>
            Tip: expiry format is <Text style={{ fontWeight: "600" }}>YYYY-MM-DD</Text>
          </Text>
        </View>

        {/* List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Items</Text>
          <Text style={styles.listCount}>{sortedFilteredItems.length}</Text>
        </View>

        <FlatList
          data={sortedFilteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {items.length === 0
                ? "No items yet. Add your first pantry item above."
                : "No matches. Try another search."}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  header: { fontSize: 28, fontWeight: "700" },
  subheader: { fontSize: 12, opacity: 0.7, marginTop: 4 },

  clearBtn: {
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clearText: { color: "#fff", fontWeight: "700" },

  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 14 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  rowInputs: { flexDirection: "row", gap: 10 },
  inputSmall: { flex: 0.35 },
  inputBig: { flex: 0.65 },

  addBtn: { backgroundColor: "#111", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  addBtnText: { color: "white", fontSize: 16, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 12, opacity: 0.75 },

  listHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: "700" },
  listCount: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    opacity: 0.8,
  },

  row: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { fontSize: 12, opacity: 0.75, marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeOk: { borderColor: "#cfe9d9" },
  badgeWarn: { borderColor: "#ffe0b2" },
  badgeBad: { borderColor: "#ffcdd2" },
  badgeNeutral: { borderColor: "#e0e0e0" },

  qtyBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 16, fontWeight: "800" },
  qtyNum: { minWidth: 18, textAlign: "center", fontWeight: "800" },

  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { fontSize: 16, opacity: 0.7 },

  empty: { marginTop: 20, textAlign: "center", opacity: 0.7 },
});