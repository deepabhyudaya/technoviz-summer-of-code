# gecX TWA Setup Guide

Complete guide to wrap the gecX Next.js PWA as an Android app using **Bubblewrap Trusted Web Activity** (no Capacitor, no WebView).

---

## Prerequisites

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Java JDK | 17+ | `winget install EclipseAdoptium.Temurin.17` |
| Bubblewrap CLI | latest | `npm install -g @bubblewrap/cli` |
| Android SDK | latest | Auto-installed by Bubblewrap |
| ADB (optional) | latest | Via Android Studio or SDK Manager |

---

## Step 1: Configure URLs

The `twa/twa-manifest.json` is already configured with your domain:

The file is already configured with:
- **Package name**: `com.gecx.app`
- **Display mode**: `fullscreen` (no browser UI)
- **Dark theme**: `#1e1f22` / `#313338`
- **Fallback**: Chrome Custom Tabs (never WebView)
- **SDK targets**: API 21–35

---

## Step 2: Initialize the Android Project

Bubblewrap reads your live manifest and generates an Android project inside `twa/`.

```powershell
# In PowerShell (project root)
cd twa
bubblewrap init --manifest twa-manifest.json
```

If Bubblewrap asks for paths, provide:
- **JDK**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`
- **Android SDK**: Let Bubblewrap auto-download, or point to Android Studio SDK folder

This creates:
- `twa/android.keystore` (signing key — back this up securely)
- `twa/app/` (Android project source)
- `twa/build.gradle` and Gradle wrappers

---

## Step 3: Build APK and AAB

```powershell
cd twa
bubblewrap build
```

Outputs:
- `twa/app-release-signed.apk` — sideload & test on devices
- `twa/app-release-bundle.aab` — upload to Google Play Console

---

## Step 4: Remove Address Bar (Digital Asset Links)

To hide Chrome’s address bar, verify domain ownership via `assetlinks.json`.

### 4a. Generate the correct fingerprint

After `bubblewrap init` creates the keystore, run:

```powershell
# From project root
node scripts/generate-assetlinks.js
```

This updates `public/.well-known/assetlinks.json` with your keystore’s SHA-256 fingerprint.

### 4b. Deploy the file

The file at `public/.well-known/assetlinks.json` is automatically served by Next.js from `https://gecbokaro.tech/.well-known/assetlinks.json`.

Deploy your Next.js app so the file is live.

### 4c. Verify

Open in browser:
```
https://gecbokaro.tech/.well-known/assetlinks.json
```

It must return valid JSON with your package name and fingerprint.

### 4d. Test on Android

Install the APK and launch. The address bar should disappear after a few seconds (Chrome verifies the link on first launch).

---

## Step 5: Play Store Publishing

1. **Sign up** for [Google Play Console](https://play.google.com/console) ($25 one-time fee)
2. **Create App** → choose your default language and title
3. **Set package name**: must match `com.gecx.app` exactly
4. **Upload** `app-release-bundle.aab` to Internal Testing track
5. **Complete**:
   - Store listing (description, screenshots, feature graphic)
   - Content rating questionnaire
   - Privacy policy (link required)
   - Data safety form
   - Pricing & distribution
6. **Rollout**: Internal Testing → Closed Testing → Production

### Updating

- **Web-only changes**: just deploy to Vercel. TWA auto-loads latest.
- **Android metadata changes** (name, icon, splash): re-run `bubblewrap update` + `bubblewrap build`, then upload new AAB.

---

## Debugging

### Remote Chrome DevTools

1. Enable **USB debugging** on Android device
2. Connect via USB
3. On desktop Chrome, open: `chrome://inspect/#devices`
4. Your TWA session appears under the device — click **Inspect**

### Logcat filtering

```powershell
adb logcat | Select-String "gecx|TWA|CustomTabs|assetlinks"
```

### Common issues

| Issue | Fix |
|-------|-----|
| Address bar still shows | Ensure `assetlinks.json` is live, fingerprint matches keystore, and package name is exact |
| Clerk login fails | Add your domain to Clerk Dashboard → URL & Origins. Cookies work normally in TWA. |
| Ably sockets disconnect | Check network permissions; TWA uses real Chrome, so WS should work. Use DevTools Network tab. |
| App opens in browser instead of standalone | Ensure `display: standalone` or `fullscreen` in web manifest and `twa-manifest.json` |
| Fallback to Custom Tabs | If Chrome is missing or outdated, Custom Tabs is the correct fallback. Do not enable WebView. |

---

## Architecture Summary

```
Android Launcher
      │
      ▼
┌─────────────────┐
│  TWA (Bubble)   │ ← no WebView, no Capacitor
│  Chrome Engine  │ ← real Chrome process
│  Fullscreen UI  │ ← no browser chrome
└─────────────────┘
      │
      ▼
  Vercel (HTTPS)
  Next.js + Clerk + Ably
```

- **Auth**: Clerk runs in Chrome → cookies/localStorage persist
- **Realtime**: Ably WebSocket uses native Chrome networking
- **Updates**: Deploy to Vercel → TWA picks up changes instantly
- **Offline**: Service Worker from next-pwa handles caching

---

## File Map

| Path | Role |
|------|------|
| `twa/twa-manifest.json` | Bubblewrap configuration source |
| `twa/android.keystore` | Android signing key (generated) |
| `twa/app/` | Generated Android project (do not edit manually) |
| `twa/README.md` | Quick reference |
| `public/manifest.json` | Web PWA manifest |
| `public/.well-known/assetlinks.json` | Domain verification for address-bar removal |
| `scripts/generate-assetlinks.js` | Helper to extract keystore fingerprint |
| `TWA_SETUP.md` | This file |
