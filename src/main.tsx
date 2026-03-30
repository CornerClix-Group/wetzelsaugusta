import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any stale service workers and clear caches for smooth updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then(names => names.forEach(name => caches.delete(name)));
}

createRoot(document.getElementById("root")!).render(<App />);
