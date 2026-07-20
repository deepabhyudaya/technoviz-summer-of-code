# TWA Android Wrapper (Bubblewrap)

Production-ready Trusted Web Activity wrapper for the gecX Next.js PWA.

## Prerequisites

- Node.js 18+
- Java JDK 17+ (required by Bubblewrap)
- Android SDK (installed automatically by Bubblewrap or via Android Studio)
- Your PWA deployed to a HTTPS Vercel URL

## 1. Install Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
bubblewrap --version
```

## 2. Configure your deployment URL

Before initializing, update `twa-manifest.json`:
- Replace `YOUR_VERCEL_URL` with your actual domain (e.g. `gecx.vercel.app`)
- Replace `YOUR_VERCEL_URL_HTTPS` with full HTTPS URL (e.g. `https://gecx.vercel.app`)

## 3. Initialize TWA Project

```bash
cd twa
bubblewrap init --manifest twa-manifest.json
```

During init, Bubblewrap will ask for JDK and Android Studio paths if not detected.

## 4. Build APK and AAB

```bash
cd twa
bubblewrap build
```

This generates:
- `app-release-signed.apk` — installable APK for testing
- `app-release-bundle.aab` — Play Store upload bundle

## 5. Play Store Deployment

1. Create a Google Play Developer account ($25 one-time)
2. Go to Play Console → Create App
3. Set package name: `com.gecx.app` (from twa-manifest.json)
4. Upload `app-release-bundle.aab` to Internal Testing track
5. Complete store listing, content rating, and pricing
6. Publish to Internal Testing → Closed Testing → Production

## 6. Asset Links Verification

After generating your keystore, run the assetlinks helper:

```bash
node scripts/generate-assetlinks.js
```

Then deploy the generated JSON to your Vercel app at:
`https://YOUR_VERCEL_URL/.well-known/assetlinks.json`

This removes the browser address bar in the TWA.

## 7. Update and Rebuild

When your web app updates, simply rebuild:

```bash
cd twa
bubblewrap update
bubblewrap build
```

No Play Store update needed for web content changes. Rebuild and re-upload only when changing Android metadata.

## Debugging

### Check TWA is using Chrome (not WebView)
- Enable Android Developer Options
- Use `adb logcat | grep TWA` to verify `Launching TWA` in Chrome
- Address bar should be hidden after assetlinks verification

### Clerk auth issues
- Ensure Clerk allowed origins include your domain
- Standard cookie-based auth works without changes in TWA

### Ably/WebSocket issues
- No special config needed; TWA runs in Chrome with full WebSocket support
- Check `chrome://inspect/#devices` to debug remote Chrome instances

### General debugging
```bash
# Install APK to connected device
adb install app-release-signed.apk

# View logs
adb logcat | grep -E "gecx|TWA|CustomTabs"

# Remote debug
# Open chrome://inspect on desktop while TWA is running on Android
```

## Configuration Reference

| File | Purpose |
|------|---------|
| `twa/twa-manifest.json` | Bubblewrap source manifest |
| `twa/android.keystore` | Signing keystore (generated during init) |
| `public/.well-known/assetlinks.json` | Domain verification for address bar removal |
| `public/manifest.json` | Web app manifest (used by Bubblewrap init) |

## No Capacitor / No WebView

This setup intentionally:
- Uses Bubblewrap CLI (not Capacitor)
- Runs in actual Chrome via Trusted Web Activity (not a WebView)
- Falls back to Chrome Custom Tabs if Chrome is unavailable
- Never uses a WebView fallback
