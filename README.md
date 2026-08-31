# AEGIS Orbital Defense

Aegis (n.): A shield, yet here, a verb. An arcade survival game built on the tension of perpetual motion and resource friction. You do not fire; you time the sweep. Includes reality-inverting "Death Levels"

A monorepo for the AEGIS web and mobile versions.

## Project Structure

- `web/` - Pure static deployment suitable for Vercel.
- `mobile/` - Capacitor.js wrapper for Android with test-mode AdMob integration.

## Vercel Deployment

Simply link the `aegis-game` root or the `web` folder to Vercel. A `vercel.json` is provided in the root directory with static asset caching headers. No build steps are required.

## Android Build Instructions (APK)

To build and test the Android APK using Capacitor, run the following commands from the `mobile/` directory:

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Add Android platform (if not already added)**:
   ```bash
   npx cap add android
   ```

3. **Copy web assets to native Android project**:
   ```bash
   npx cap copy
   ```

4. **Build the Debug APK via Gradle CLI**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   *Alternatively, you can open the project in Android Studio by running `npx cap open android`.*

5. **Locate the APK**:
   The resulting debug APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Features Included

- **Capacitor AdMob**: The current Android integration uses Google's test banner configuration. Production ads require real AdMob app/ad-unit IDs, policy compliance, and store configuration.
- **Purchases**: Play Billing and a remove-ads product are not currently implemented. Shipping either requires merchant and Play Console product configuration plus a verified native billing flow.

## Tests and Shared Runtime

`mobile/src` is canonical for `game-rules.js`, `game-core-1.js`, and `game-core-2.js`. From `mobile/`:

```bash
npm ci
npm test
npm run sync:shared
npm run check:shared
```

The sync command copies the shared runtime to `web/` and, when that directory exists in the workspace, `../public/game/`. The check command exits nonzero if a copy has drifted.
