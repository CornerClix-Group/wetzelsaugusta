import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TimeClock from "./pages/TimeClock";
import Compliance from "./pages/Compliance";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/timeclock" element={<TimeClock />} />
          <Route path="/dashboard/compliance" element={<Compliance />} />
          <Route path="/dashboard/hr-onboarding" element={<HROnboarding />} />
          <Route path="/dashboard/trucks" element={<Trucks />} />
          <Route path="/dashboard/employees" element={<Employees />} />
          <Route path="/dashboard/schedule" element={<Schedule />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
