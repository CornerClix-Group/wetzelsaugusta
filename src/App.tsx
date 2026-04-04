import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import TimeClock from "./pages/TimeClock";
import Compliance from "./pages/Compliance";
import Inventory from "./pages/Inventory";
import HROnboarding from "./pages/HROnboarding";
import Trucks from "./pages/Trucks";
import Employees from "./pages/Employees";
import Schedule from "./pages/Schedule";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
);

export default App;
