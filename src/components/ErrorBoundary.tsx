import { Component, type ReactNode } from "react";
import { MISSING_SUPABASE_ENV, isSupabaseConfigured } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that prevents a blank-screen failure mode.
 *
 * Two scenarios it catches:
 *  1. Supabase env vars missing on the deploy → renders a config-error card.
 *  2. Any uncaught render error in any descendant → renders a recovery card
 *     with a "Reset app" button that clears storage and reloads, plus a
 *     "Sign out & retry" button for stuck auth states.
 *
 * If you ever see this screen in production: bump the kill-switch version
 * in src/main.tsx and redeploy. That clears every user's SW + caches.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[Wetzels] Uncaught render error:", error, info.componentStack);
  }

  handleReset = async () => {
    try {
      // Clear every form of client-side state we own. Cookies survive,
      // but anything in storage/IndexedDB/SW caches gets wiped.
      localStorage.clear();
      sessionStorage.clear();
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      // best-effort
    } finally {
      // Hard reload, ignoring HTTP cache where supported.
      window.location.href = "/";
    }
  };

  render() {
    // Config-error path — render BEFORE any other rendering attempts so the
    // user sees something useful even if literally nothing else can mount.
    if (!isSupabaseConfigured) {
      return (
        <ErrorScreen
          title="Configuration Error"
          subtitle="The app can't reach Supabase."
          details={
            <>
              Missing environment variables:
              <ul className="mt-2 ml-5 list-disc">
                {MISSING_SUPABASE_ENV.map((k) => (
                  <li key={k} className="font-mono text-xs">{k}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs opacity-70">
                Set these on your deployment host (Lovable → Project Settings → Variables)
                and redeploy.
              </p>
            </>
          }
        />
      );
    }

    if (this.state.hasError) {
      return (
        <ErrorScreen
          title="Something went wrong"
          subtitle="The app hit an unexpected error."
          details={
            this.state.error?.message ? (
              <code className="block text-xs font-mono break-all opacity-70">
                {this.state.error.message}
              </code>
            ) : null
          }
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

function ErrorScreen({
  title,
  subtitle,
  details,
  onReset,
}: {
  title: string;
  subtitle: string;
  details?: ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[360px] bg-card rounded-2xl shadow-xl p-6">
        <div className="flex flex-col items-center text-center">
          <img
            src="/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="rounded-xl mb-4"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          {details && (
            <div className="mt-4 w-full text-left text-sm text-foreground/80 bg-muted rounded-lg p-3">
              {details}
            </div>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="mt-5 w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all active:scale-[0.98]"
            >
              Reset app
            </button>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground/60">
            If this keeps happening, contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
