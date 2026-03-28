import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Clock,
  ClipboardCheck,
  Truck,
  Users,
  Calendar,
  Settings,
  LogOut,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";

const allMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, employeeVisible: true, businessManagerVisible: true },
  { title: "Time Clock", url: "/dashboard/timeclock", icon: Clock, employeeVisible: true, businessManagerVisible: true },
  { title: "Compliance", url: "/dashboard/compliance", icon: ClipboardCheck, employeeVisible: false, businessManagerVisible: false },
  { title: "Inventory", url: "/dashboard/inventory", icon: Package, employeeVisible: false, businessManagerVisible: false },
  { title: "HR & Onboarding", url: "/dashboard/hr-onboarding", icon: Users, employeeVisible: false, businessManagerVisible: true },
  { title: "Trucks", url: "/dashboard/trucks", icon: Truck, employeeVisible: false, businessManagerVisible: false },
  { title: "Employees", url: "/dashboard/employees", icon: Users, employeeVisible: false, businessManagerVisible: false },
  { title: "Schedule", url: "/dashboard/schedule", icon: Calendar, employeeVisible: true, businessManagerVisible: false },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, employeeVisible: true, businessManagerVisible: true },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isElevated, setIsElevated] = useState(false);
  const [isBusinessManager, setIsBusinessManager] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = data?.map((r) => r.role) ?? [];
        setIsElevated(
          roles.includes("owner") ||
          roles.includes("franchise_owner") ||
          roles.includes("manager") ||
          roles.includes("shift_lead")
        );
        setIsBusinessManager(roles.includes("business_manager"));
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const menuItems = isElevated
    ? allMenuItems
    : allMenuItems.filter((item) => item.employeeVisible);

  // Derive page title from current route
  const currentItem = allMenuItems.find((item) =>
    item.url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(item.url)
  );
  const pageTitle = currentItem?.title ?? "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r" collapsible="icon">
          <SidebarContent>
            <div className="p-6 border-b border-sidebar-border">
              <h1 className="text-xl font-bold text-sidebar-foreground">Wetzels of Augusta</h1>
              <p className="text-sm text-sidebar-accent-foreground">Operations Platform</p>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 border-t border-sidebar-border">
              <div className="text-sm text-sidebar-accent-foreground mb-2 truncate">
                {user?.email}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-6">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold ml-4">{pageTitle}</h2>
          </header>

          <main className="flex-1 p-6 bg-muted">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
