import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="timeclock" element={<TimeClock />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="hr-onboarding" element={<HROnboarding />} />
            <Route path="trucks" element={<Trucks />} />
            <Route path="employees" element={<Employees />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
