

## Add Cache-Busting for Smooth Updates

Since the app is installed as a PWA on tablets, browsers can aggressively cache old versions. We'll add a service worker unregistration guard and a version-check mechanism so updates always come through cleanly.

### Steps

**1. Add a service worker cleanup guard in `src/main.tsx`**

On every app load, unregister any stale service workers and clear all caches. This prevents the browser from serving old cached files.

```typescript
// Unregister any service workers and clear caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then(names => names.forEach(name => caches.delete(name)));
}
```

**2. Add a version meta tag to `index.html`**

Add `<meta name="app-version" content="TIMESTAMP">` that gets updated with each build, helping the browser recognize new versions.

**3. Add cache-control headers via `vercel.json` or `public/_headers`**

Create a `public/_headers` file to set `Cache-Control: no-cache` on `index.html` so the entry point is always fresh (Vite already hashes JS/CSS filenames for cache-busting on assets).

### Files

| File | Change |
|------|--------|
| `src/main.tsx` | Add SW unregistration + cache clearing on startup |
| `public/_headers` | New — set no-cache on index.html |

