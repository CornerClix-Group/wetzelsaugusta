import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ─── SERVICE-WORKER KILL SWITCH ─────────────────────────────────────────
//
// The site is installed as a PWA on POS tablets. If a broken build ever
// ships, vite-plugin-pwa's service worker will keep serving that broken
// build *forever* from cache — new deploys won't reach users until they
// manually wipe storage on each device.
//
// Bumping APP_KILLSWITCH_VERSION causes every client to unregister all
// service workers and clear all caches the next time they open the app.
// After that, the fresh SW from the new deploy takes over normally.
//
// HOW TO USE: if the production site is stuck on a bad version, bump this
// constant and ship. Users open the app once, get a clean slate, and the
// new bundle loads. Bump it again any time you need another forced reset.
const APP_KILLSWITCH_VERSION = "2026-05-15-01";
const KILLSWITCH_KEY = "wetzels:sw-killswitch";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app/~");

// Always nuke SW + caches in iframes/preview (the original behavior),
// AND once per APP_KILLSWITCH_VERSION change in production.
const storedVersion = (() => {
  try {
    return localStorage.getItem(KILLSWITCH_KEY);
  } catch {
    return null;
  }
})();

const killSwitchTripped = storedVersion !== APP_KILLSWITCH_VERSION;

if (isPreviewHost || isInIframe || killSwitchTripped) {
  // Best-effort cleanup. We swallow errors because none of this is critical
  // to render — the app should boot even if SW APIs are unavailable.
  try {
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  } catch {}
  try {
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
  } catch {}
  try {
    localStorage.setItem(KILLSWITCH_KEY, APP_KILLSWITCH_VERSION);
  } catch {}
}

createRoot(document.getElementById("root")!).render(<App />);
