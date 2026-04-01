# Harvest Rush

A fast-paced 16-bit-style farming defense game built with React Native + Expo. Plant, water, and
harvest crops with touch controls while fending off waves of animals and thief NPCs that try to
steal your crops. Sell harvests for upgrades (faster growth, tractors, irrigation, fencing) to
keep pace with escalating waves.

## Tech stack

- **Expo (managed workflow, EAS Build)** — React Native 0.86, TypeScript, strict mode
- **react-native-game-engine** — drives the player/enemy update loop (touch input, movement, AI)
- **Zustand + AsyncStorage** — local game state (player, farm, economy, settings), offline-first
- **Firebase Auth (anonymous) + Firestore** — optional cloud save, debounced sync
- **RevenueCat (`react-native-purchases`)** — in-app purchases (gem packs), cross-platform
- **`react-native-expo-game-kit`** — Game Center (iOS) / Play Games Services (Android) facade
- **Code-drawn pixel art** — all sprites (`src/pixelart/`) are palette-indexed matrices rendered
  via `react-native-svg`, not binary image assets. This makes the game fully playable today and
  keeps art swappable later — see "Replacing placeholder art" below.

## Project structure

```
src/
  pixelart/       sprite matrices + the PixelCanvas renderer
  theme/          shared color palette
  state/          zustand stores (player, economy, farm, settings, run)
  game/           game loop: constants, growth math, entities, systems, HUD components
  services/       firebase, cloud save, RevenueCat IAP, Game Center/Play Games
  screens/        Loading, Home, Game, Shop, Customize, Settings
  navigation/      React Navigation stack
```

## Running locally

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go for the UI/navigation/farming loop. **In-app purchases and Game
Center/Play Games will not work in Expo Go** — those are native modules that require a custom dev
client or a full build (see below). They fail gracefully (no-op with a console warning) when the
native module isn't present, so the rest of the app stays usable.

To test IAP / Game Center / Play Games locally, build a dev client:

```bash
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

## Setup required before this is a real, submittable app

Everything below is wired up in code but points at placeholder values — the game is fully
playable without doing any of this, but purchases/leaderboards/cloud save won't function for real
users until you do.

### 1. Firebase (cloud save)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add an iOS app (bundle ID must match `app.json` → `expo.ios.bundleIdentifier`) and an Android
   app (must match `expo.android.package`).
3. Enable **Anonymous** sign-in under Authentication → Sign-in method.
4. Create a Firestore database (production mode; add security rules restricting each
   `saves/{uid}` document to its own authenticated uid).
5. Copy the web config object into `src/services/firebaseConfig.ts`.

### 2. RevenueCat (in-app purchases)

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com), add iOS and Android apps.
2. In App Store Connect / Google Play Console, create **consumable** IAP products matching the
   identifiers in `src/services/iapConfig.ts` (`gems_small`, `gems_medium`, `gems_large`,
   `gems_mega`) — set your own prices per gem amount.
3. In RevenueCat, add those products to a "default" offering with matching package identifiers.
4. Copy the iOS and Android **public** SDK keys into `src/services/iapConfig.ts`.
5. For production fraud-hardening, add a RevenueCat webhook → Cloud Function that verifies
   purchases server-side before crediting gems, instead of the client-side grant currently in
   `src/services/iap.ts`.

### 3. Game Center (iOS) / Play Games Services (Android)

1. iOS: enable Game Center capability for your App ID in the Apple Developer portal, and create
   leaderboards/achievements in App Store Connect matching the IDs in
   `src/services/gameServices.ts` (`LEADERBOARD_WAVE_ID`, `LEADERBOARD_COINS_ID`, `ACHIEVEMENTS`).
2. Android: create a Play Games Services project linked to your app in Play Console, and create
   matching leaderboards/achievements there.
3. This library needs a native build (dev client or EAS build) — it does not work in Expo Go.

### 4. Legal pages

`src/legal.ts` has placeholder URLs for a privacy policy, terms of service, and support email.
Both app stores require a **reachable** privacy policy URL before they'll review the app — a free
static page (GitHub Pages, Notion public page) is enough. It must accurately describe what this
app collects: a Firebase Auth UID, gameplay save data, and IAP transaction data via RevenueCat.

### 5. App icons & splash screen

`assets/` currently has Expo's default placeholder icons. Replace `icon.png`,
`android-icon-foreground.png`/`background.png`/`monochrome.png`, and `splash-icon.png` with real
16-bit-style artwork before submitting — stores reject default/placeholder icons.

## Replacing placeholder art

Every sprite is a small function in `src/pixelart/sprites.ts` returning a `PixelMatrix` (a grid of
palette color keys) — e.g. `buildFarmerSprite()`, `buildCropSprite()`, `buildChickenSprite()`.
To swap in real pixel-art assets instead: replace `PixelCanvas` usages with `<Image>` (or
`expo-image`) pointing at sprite sheet frames, keeping the same component props (position,
direction, frame) so the game loop code doesn't need to change.

## Building & submitting with EAS

```bash
npm install -g eas-cli
eas login
eas build:configure        # links a real EAS project id into app.json's `extra.eas`
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```

`eas.json` has `development` (simulator, dev client), `preview` (internal APK/ad-hoc), and
`production` profiles already set up.

## App Store / Play Store submission checklist

- [ ] Apple Developer account ($99/yr) and Google Play Developer account ($25 one-time)
- [ ] Real bundle identifier / package name in `app.json` (currently `com.harvestrush.app` —
      change this to something you own)
- [ ] Firebase, RevenueCat, Game Center/Play Games configured per steps above
- [ ] Real app icon, splash screen, and screenshots (all placeholder currently)
- [ ] Privacy policy hosted and linked in `src/legal.ts`, App Store Connect, and Play Console
- [ ] Play Console **Data Safety** form filled out (declares Firebase UID + save data collection)
- [ ] App Store **App Privacy** (nutrition label) filled out in App Store Connect
- [ ] `ITSAppUsesNonExemptEncryption: false` in `app.json` is correct as long as you don't add
      custom encryption beyond standard HTTPS/TLS
- [ ] IAP products created and approved in both stores; RevenueCat offering linked
- [ ] Age rating questionnaire completed (this game has cartoon violence-adjacent "theft" content
      but no real violence/blood — typically rates as everyone/4+ or similar, confirm during setup)
- [ ] TestFlight / Play Console internal testing pass with a real device before public release
- [ ] "Restore Purchases" tested on a real device (required by Apple guideline 3.1.1)
- [ ] Settings screen already has "Reset All Progress" as a basic data-deletion control; expand if
      you add real user accounts (Apple 5.1.1(v) requires an in-app account deletion path once
      accounts exist beyond anonymous)

None of this can be done for you sight-unseen — it requires your own developer accounts, product
pricing decisions, and store-listing content — but everything on the code side is wired up and
ready to connect.

## Known limitations

- Placeholder pixel art (see "Replacing placeholder art" above)
- IAP fulfillment is client-side on successful purchase; see "Hardening IAP against fraud" note
  in `src/services/iap.ts` for the production-grade approach
- Web preview (`npx expo start --web`) needed a Metro resolver workaround in `metro.config.js` for
  an `rxjs`/`tslib` interop bug specific to web bundling — iOS/Android are unaffected
