import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eagerly loaded — these are the entry surfaces every user hits first.
// Keeping them in the main chunk avoids a Suspense flash on the time-clock terminal.
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy — the dashboard and its children are gated behind auth, and most
// time-clock users never see them. Splitting saves ~400KB on first load.
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TimeClock = lazy(() => import("./pages/TimeClock"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Inventory = lazy(() => import("./pages/Inventory"));
const HROnboarding = lazy(() => import("./pages/HROnboarding"));
const Trucks = lazy(() => import("./pages/Trucks"));
const Employees = lazy(() => import("./pages/Employees"));
const Schedule = lazy(() => import("./pages/Schedule"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sensible defaults for an ops dashboard: don't refetch every
      // window-focus on a tablet that's left running all day.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<AppLoadingScreen />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="timeclock" element={<TimeClock />} />
                <Route path="compliance" element={<Compliance />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="hr-onboarding" element={<HROnboarding />} />
                <Route path="trucks" element={<Trucks />} />
                <Route path="employees" element={<Employees />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="/timeclock" element={<Navigate to="/dashboard/timeclock" replace />} />
              <Route path="/compliance" element={<Navigate to="/dashboard/compliance" replace />} />
              <Route path="/inventory" element={<Navigate to="/dashboard/inventory" replace />} />
              <Route path="/hr-onboarding" element={<Navigate to="/dashboard/hr-onboarding" replace />} />
              <Route path="/trucks" element={<Navigate to="/dashboard/trucks" replace />} />
              <Route path="/employees" element={<Navigate to="/dashboard/employees" replace />} />
              <Route path="/schedule" element={<Navigate to="/dashboard/schedule" replace />} />
              <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
