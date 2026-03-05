import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Linking} from "react-native";


const BACKEND_URL = "http://172.22.0.171:3000";

export default function App() {
  const [ingredientsText, setIngredientsText] = useState("chicken, rice, broccoli");
  const [restrictionsText, setRestrictionsText] = useState("no pork");
  const [budgetText, setBudgetText] = useState("15");
  const [budgetType, setBudgetType] = useState("per_meal"); // "per_meal" or "per_week"

  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const ingredients = useMemo(
    () =>
      ingredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [ingredientsText]
  );

  const restrictions = useMemo(
    () =>
      restrictionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [restrictionsText]
  );

  const budget = useMemo(() => {
    const n = Number(budgetText);
    return Number.isFinite(n) ? n : 0;
  }, [budgetText]);

  async function fetchRecipes() {
    setErrorMsg("");
    setRecipes([]);

    if (!ingredients.length) {
      Alert.alert("Missing info", "Add at least 1 ingredient (comma-separated).");
      return;
    }
    if (budget <= 0) {
      Alert.alert("Budget issue", "Enter a budget greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/recipes/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          restrictions,
          budget,
          budgetType, 
          maxMissingItems: 1, 
          maxResults: 5,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
      if (!Array.isArray(data.recipes) || data.recipes.length === 0) {
        setErrorMsg("No matches found. Try adding 1–2 more ingredients or relaxing preferences.");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Recipe Finder</Text>

        <Text style={styles.label}>Ingredients you have (comma-separated)</Text>
        <TextInput
          value={ingredientsText}
          onChangeText={setIngredientsText}
          placeholder="eggs, milk, oats"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Dietary restrictions (comma-separated)</Text>
        <TextInput
          value={restrictionsText}
          onChangeText={setRestrictionsText}
          placeholder="gluten-free, no dairy, halal"
          style={styles.input}
          autoCapitalize="none"
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Budget</Text>
            <TextInput
              value={budgetText}
              onChangeText={setBudgetText}
              placeholder="15"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={{ width: 12 }} />

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Budget type</Text>
            <View style={styles.toggleRow}>
              <ToggleButton
                active={budgetType === "per_meal"}
                label="Per meal"
                onPress={() => setBudgetType("per_meal")}
              />
              <ToggleButton
                active={budgetType === "per_week"}
                label="Per week"
                onPress={() => setBudgetType("per_week")}
              />
            </View>
          </View>
        </View>

        <Pressable style={styles.button} onPress={fetchRecipes} disabled={loading}>
          {loading ? <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginLeft: 8 }}>Searching recipes...</Text>
        </View>: <Text style={styles.buttonText}>Find recipes</Text>}
        </Pressable>

        {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        {recipes.map((r, idx) => (
          <View key={`${r?.url || r?.title || idx}`} style={styles.card}>
            <Text style={styles.cardTitle}>
              {idx + 1}. {r.title || "Recipe"}
            </Text>

           {r.url && r.url !== "N/A" && (
            <Text
              style={styles.link}
              onPress={() => {
                let url = r.url;

                if (!url.startsWith("http")) {
                  url = `https://${url}`;
                }

                Linking.openURL(url);
              }}
            >
              View Recipe
            </Text>
          )}

            <Text style={styles.meta}>
              {r.timeMinutes ? `${r.timeMinutes} min` : "Time n/a"} ·{" "}
              {r.servings ? `${r.servings} servings` : "Servings n/a"} ·{" "}
              {typeof r.estimatedCost === "number" ? `$${r.estimatedCost.toFixed(2)}` : "Cost n/a"}
            </Text>

            {!!r.whyMatches && <Text style={styles.why}>Why it fits: {r.whyMatches}</Text>}

            {!!r.missingItem && (
              <Text style={styles.missing}>
                Missing item (allowed 1): {r.missingItem}
                {!!r.substitution && ` · Sub: ${r.substitution}`}
              </Text>
            )}

            {!!r.ingredientsHave?.length && (
              <Text style={styles.section}>
                 You have: {r.ingredientsHave.join(", ")}
              </Text>
            )}
            {!!r.ingredientsNeed?.length && (
              <Text style={styles.section}>
                 Need: {r.ingredientsNeed.join(", ")}
              </Text>
            )}

            {!!r.steps?.length && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionTitle}>Steps</Text>
                {r.steps.slice(0, 6).map((s, i) => (
                  <Text key={i} style={styles.step}>
                    {i + 1}. {s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleButton({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleBtnActive: { borderColor: "#111" },
  toggleText: { fontSize: 13, color: "#333" },
  toggleTextActive: { fontWeight: "700", color: "#111" },
  button: {
    marginTop: 16,
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { marginTop: 12, color: "#b00020", fontSize: 14 },
  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fafafa",
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  link: { marginTop: 6, color: "#0b5fff", fontSize: 12 },
  meta: { marginTop: 8, color: "#444", fontSize: 12 },
  why: { marginTop: 8, fontSize: 13, color: "#222" },
  missing: { marginTop: 6, fontSize: 13, color: "#222" },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  section: { marginTop: 8, fontSize: 13, color: "#222" },
  step: { fontSize: 13, color: "#222", marginBottom: 4 },
});