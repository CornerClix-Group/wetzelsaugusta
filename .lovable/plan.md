

## Make Your App Installable on Tablets

You can make your app installable so it shows up with an icon on your tablet's home screen — just like a regular app. When you tap the icon, it opens full-screen without the browser bar.

This does **not** require the App Store or Google Play. It uses a standard web feature called a "Web App Manifest" that tells the device your website can be installed as an app.

### What You'll Get

- An app icon on your tablet's home screen
- Full-screen experience (no browser address bar)
- Launches instantly like a native app
- Works on both iPad and Android tablets

### Steps

**1. Create a web app manifest file**

A small config file (`public/manifest.json`) that defines the app name, icon, colors, and display mode. This tells the browser "this website can be installed as an app."

**2. Add app icons**

Create appropriately sized icons (192x192 and 512x512) for the home screen. These will use your brand colors (blue/gold from Wetzel's).

**3. Update `index.html`**

Add a link to the manifest and mobile-friendly meta tags so the browser knows the app is installable.

**4. Add an install prompt**

Add a small, subtle install banner or button that appears when visiting from a tablet/phone, guiding users to install the app.

### How to Install (After Implementation)

- **iPad/iPhone**: Open the site in Safari → tap the Share button → "Add to Home Screen"
- **Android tablet**: Open in Chrome → tap the 3-dot menu → "Add to Home Screen" (or an install prompt may appear automatically)

### Files to Create/Modify

| File | Change |
|------|--------|
| `public/manifest.json` | New — app name, icons, theme color, display mode |
| `public/icon-192.png` | New — generated app icon |
| `public/icon-512.png` | New — generated app icon |
| `index.html` | Add manifest link + mobile meta tags |

