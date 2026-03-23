# Go-To Grocery App

Developed by **Team D.O.M.E** for Capstone 4901 at the University of North Texas.

A cross-platform iOS/Android app that helps users shop smarter, reduce food waste, and make healthier product choices.

---

## Features

- **Welcome Onboarding** — 3-slide introduction flow on first launch
- **Grocery Search** — Search, filter by category, and sort items; add to a shopping list
- **Smart Product Scanner** — Live barcode scanner (EAN, UPC, QR) that rates product health and suggests healthier alternatives
- **Pantry Tracker** — Add items with expiry dates and quantities; get expiry badges (expired / soon / ok); auto-saved locally
- **Recommendations Screen** — View healthier product alternatives after scanning
- **Login / Sign Up** — Authentication screen with email/password validation

---

## Tech Stack

- [Expo](https://expo.dev) (SDK 55) + [Expo Router](https://expo.github.io/router) for file-based navigation
- React Native 0.83
- `expo-camera` for barcode scanning
- `@react-native-async-storage/async-storage` for pantry persistence
- `@supabase/supabase-js` (configured, cloud sync planned)

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone, **or** Android Studio with an emulator

### Setup

```bash
git clone https://github.com/DOME-Capstone4901/go-to-grocery-app_2.git
cd go-to-grocery-app_2
npm install
```

> `.npmrc` is included — no extra flags needed.

### Run on Android Emulator

1. Open **Android Studio** → **Virtual Device Manager** → start your emulator
2. Wait for the emulator to fully boot (home screen visible)
3. Then run:

```bash
npx expo start --android
```

> Always start the emulator **before** running the command.

### Run on Physical Phone

1. Install **Expo Go** from the Play Store / App Store
2. Run `npx expo start` and scan the QR code with your phone

### Run on iOS Simulator (Mac only)

```bash
npx expo start --ios
```

---

## App Flow

```
WelcomeScreen (onboarding)
    └── Search Tab    — grocery search + shopping list
    └── Scan Tab      — live barcode scanner → Recommendations
    └── Pantry Tab    — expiry tracking + qty management
         └── LoginScreen (via ⚙️ or Recommendations)
```

---

## Environment Variables

For Supabase cloud sync (optional, future phase), create a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

---

## Team

| Name | Role |
|------|------|
| Elsa Joy | |
| Mikal Debesay | |
| Olajumoke Kupoluyi | |
| D'yanna Grey | |
| Subol Dhital | |
| Saubhagya Bhandari | |

*Capstone 4901 — University of North Texas*
