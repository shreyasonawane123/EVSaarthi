# 🔌 EV Saarthi — PWA Setup Documentation

> This document describes all changes made to convert EV Saarthi into a fully functional Progressive Web App (PWA), along with testing steps and a final checklist.

---

## 📋 What Is a PWA?

A Progressive Web App is a web application that can be **installed** on a user's device (phone, tablet, desktop) just like a native app. It can work **offline**, loads **fast**, and can be added to the **home screen** with its own icon.

---

## 🔧 Changes Made

### 1. `public/manifest.json` — App Identity

| Field | Value | Purpose |
|---|---|---|
| `id` | `/` | Unique identity for the PWA |
| `name` | EV Saarthi — Smart EV Companion | Full name shown during install |
| `short_name` | EV Saarthi | Name shown on home screen |
| `description` | India's smartest EV companion... | App description |
| `start_url` | `/` | Page that opens when app launches |
| `scope` | `/` | Which pages the PWA controls |
| `display` | `standalone` | Opens without browser chrome (like a native app) |
| `orientation` | `portrait` | Default orientation on mobile |
| `theme_color` | `#16A34A` | Status bar color on Android |
| `background_color` | `#F5F5F5` | Splash screen background |
| `icons` | 192x192 + 512x512 | Required for install prompt and splash screen |
| `screenshots` | wide + narrow | Enables richer install UI on Android |
| `categories` | utilities, lifestyle | App store categorization |

### 2. `public/service-worker.js` — Offline Support & Caching

The service worker uses **three separate caching strategies** depending on the type of request:

| Request Type | Strategy | Why |
|---|---|---|
| **API calls** (`/api/*`) | Network-First | Always try to get fresh data; use cached data only if offline |
| **Page navigation** | Network-First + SPA Fallback | Load fresh page from server; if offline, serve cached `/index.html` |
| **Static assets** (JS, CSS, images, fonts) | Stale-While-Revalidate | Return cached version instantly for speed, update cache in background |

**Cache lifecycle:**
- **Install** → Pre-caches the app shell (HTML, icons, manifest, offline page)
- **Activate** → Deletes old caches from previous versions
- **Fetch** → Intercepts every network request and applies the right strategy

### 3. `public/offline.html` — Offline Fallback Page

A beautiful branded page that appears when:
- The user is completely offline
- The requested page was never cached before
- Features a "Try Again" button and helpful tips

### 4. `public/index.html` — Meta Tags

Added/fixed the following:
```html
<meta name="theme-color" content="#16A34A" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="EV Saarthi" />
<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
<link rel="apple-touch-icon" href="%PUBLIC_URL%/icon-192.png" />
```

**Key fix:** `theme-color` was `#EAB308` (yellow) but manifest had `#16A34A` (green). Now both match.

### 5. `src/index.js` — Service Worker Registration

Enhanced registration with:
- Auto-update check every 60 seconds
- `updatefound` listener for seamless background updates
- Proper error handling

### 6. `public/icon-192.png` & `public/icon-512.png` — PWA Icons

Two icon sizes as required by the PWA spec:
- **192×192** — Used for home screen icon
- **512×512** — Used for splash screen and install dialog

---

## 📁 Files Added / Modified

| File | Action | Location |
|---|---|---|
| `manifest.json` | ✅ Created/Fixed | `frontend/shell-app/public/` |
| `service-worker.js` | ✅ Created/Fixed | `frontend/shell-app/public/` |
| `offline.html` | ✅ Created (NEW) | `frontend/shell-app/public/` |
| `index.html` | ✅ Modified | `frontend/shell-app/public/` |
| `index.js` | ✅ Modified | `frontend/shell-app/src/` |
| `icon-192.png` | ✅ Created | `frontend/shell-app/public/` |
| `icon-512.png` | ✅ Created | `frontend/shell-app/public/` |

---

## 🧪 How to Test Your PWA

### Step 1: Start the App
```bash
# Run your start-all.bat or manually:
cd frontend/shell-app
npm start
```
Open `http://localhost:3000` in **Google Chrome**.

### Step 2: Check in Chrome DevTools

1. Press **F12** to open DevTools
2. Go to the **Application** tab

#### ✅ Check Manifest
- Click **Manifest** in the left sidebar
- You should see all fields (name, icons, colors, etc.)
- No warnings or errors should appear

#### ✅ Check Service Worker
- Click **Service Workers** in the left sidebar
- Status should show: **activated and running** (green circle)
- Source should be: `service-worker.js`

#### ✅ Check Cache Storage
- Click **Cache Storage** in the left sidebar
- You should see two caches:
  - `ev-saarthi-static-v2` (pre-cached app shell)
  - `ev-saarthi-runtime-v2` (dynamically cached assets)

### Step 3: Test Offline Mode

1. In DevTools → **Application** → **Service Workers**
2. Check the **"Offline"** checkbox
3. Refresh the page
4. ✅ The app should still load (from cache)
5. Navigate to a page you haven't visited → You should see the **EV Saarthi Offline** page
6. Uncheck "Offline" and click "Try Again" → App resumes normally

### Step 4: Test Installability

1. Look for the **install icon** (⊕ or computer icon) in Chrome's address bar
2. Click it → You'll see the install dialog with your app name and icon
3. Click **Install** → The app opens in its own window (standalone mode)
4. Check your desktop/start menu → EV Saarthi shortcut should appear

### Step 5: Run Lighthouse Audit

1. In DevTools, go to the **Lighthouse** tab
2. Select **Progressive Web App** category
3. Click **Analyze page load**
4. ✅ All PWA checks should pass (green checkmarks)

---

## ✅ Final PWA Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | `manifest.json` exists and is linked | ✅ Done |
| 2 | `manifest.json` has `name` and `short_name` | ✅ Done |
| 3 | `manifest.json` has `start_url` | ✅ Done |
| 4 | `manifest.json` has `display: standalone` | ✅ Done |
| 5 | `manifest.json` has `theme_color` and `background_color` | ✅ Done |
| 6 | `manifest.json` has `id` field | ✅ Done |
| 7 | `manifest.json` has `scope` field | ✅ Done |
| 8 | `manifest.json` has `screenshots` for richer install | ✅ Done |
| 9 | Icon 192×192 present | ✅ Done |
| 10 | Icon 512×512 present | ✅ Done |
| 11 | Maskable icon declared separately | ✅ Done |
| 12 | Service worker registered | ✅ Done |
| 13 | Service worker caches app shell on install | ✅ Done |
| 14 | Service worker handles fetch with proper strategies | ✅ Done |
| 15 | Service worker cleans old caches on activate | ✅ Done |
| 16 | Offline fallback page exists | ✅ Done |
| 17 | Navigation works offline (SPA fallback) | ✅ Done |
| 18 | API data cached for offline reading | ✅ Done |
| 19 | `theme-color` meta tag matches manifest | ✅ Done |
| 20 | Apple PWA meta tags added (iOS support) | ✅ Done |
| 21 | App is installable (Add to Home Screen) | ✅ Done |
| 22 | Service worker auto-updates | ✅ Done |
| 23 | Existing features (maps, booking, etc.) not broken | ✅ Verified |
| 24 | Works on HTTPS or localhost | ✅ Done |

---

## 🚀 Deployment Notes

When deploying to production:
1. **HTTPS is required** — PWAs only work on HTTPS (localhost is the only exception)
2. **Build first** — Run `npm run build` to create the optimized production bundle
3. The `service-worker.js` and `manifest.json` are in the `public/` folder, so they will be automatically included in the build output
4. **Custom icons** — Replace `icon-192.png` and `icon-512.png` with your actual branded icons before production deployment

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| Install button not appearing | Make sure all manifest fields are correct. Clear cache and reload. |
| Service worker not registering | Check browser console for errors. Must be on localhost or HTTPS. |
| Old cached content showing | Go to DevTools → Application → Storage → Clear site data |
| Offline not working | Visit a few pages first while online so they get cached |
| iOS not showing install | On Safari, tap Share → Add to Home Screen |

---

*Last updated: April 30, 2026*
