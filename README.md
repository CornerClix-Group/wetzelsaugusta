# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2b2d6fcb-54fa-458a-95a8-b65ce8ab771d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2b2d6fcb-54fa-458a-95a8-b65ce8ab771d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2b2d6fcb-54fa-458a-95a8-b65ce8ab771d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Mobile Packaging Notes (Capacitor)

### Icon Files
All PWA and app icons live in the `/public` directory:
- `icon-192.png` — 192×192 standard icon
- `icon-512.png` — 512×512 standard icon
- `maskable-icon-512.png` — 512×512 maskable icon (safe-zone padding)
- `apple-touch-icon.png` — iOS home screen icon

For Capacitor native builds, generate platform-specific icons with:
```sh
npx capacitor-assets generate
```
Place source assets in `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732).

### Splash Screen Assets
Splash screens for native builds should go in `resources/splash.png`. Capacitor Assets will auto-generate all required sizes.

### Environment / Config Concerns
- The Vite build output (`dist/`) is the web root for Capacitor's WebView.
- Routing uses `BrowserRouter` — Capacitor works with this via `server.url` in `capacitor.config.ts`.
- All API calls use `import.meta.env.VITE_SUPABASE_PROJECT_ID` — this is baked in at build time and works in WebView.
- The service worker is disabled in dev/preview. It only activates in production builds.
- Safe-area insets are handled via CSS `env(safe-area-inset-*)` variables.

### Quick Start for Capacitor
```sh
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
npx cap add ios    # or android
npm run build
npx cap sync
npx cap run ios    # or android
```
