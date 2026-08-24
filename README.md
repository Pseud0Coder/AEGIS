# AEGIS Orbital Defense

Aegis (n.): A shield, yet here, a verb. An arcade survival game built on the tension of perpetual motion and resource friction. You do not fire; you time the sweep. Includes reality-inverting "Death Levels"

A monorepo for the AEGIS web and mobile versions.

## Project Structure

- `web/` - Pure static deployment suitable for Vercel.
- `mobile/` - Capacitor.js wrapper for Android with AdMob and IAP integration.

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

- **Capacitor AdMob**: Shows a banner ad at the bottom of the screen (uses test ad ID). Automatically adjusts game canvas size so it does not block the UI.
- **In-App Purchase**: "Remove Ads" button unlocks the premium tier and removes the AdMob banner permanently using `localStorage` caching (along with native IAP hooks).
