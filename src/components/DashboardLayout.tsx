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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppLoadingScreen from "@/components/AppLoadingScreen";

const allMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permissionKey: null, alwaysVisible: true },
  { title: "Time Clock", url: "/dashboard/timeclock", icon: Clock, permissionKey: null, alwaysVisible: true },
  { title: "Compliance", url: "/dashboard/compliance", icon: ClipboardCheck, permissionKey: "compliance", alwaysVisible: false },
  { title: "Inventory", url: "/dashboard/inventory", icon: Package, permissionKey: "inventory", alwaysVisible: false },
  { title: "HR & Onboarding", url: "/dashboard/hr-onboarding", icon: Users, permissionKey: "hr_onboarding", alwaysVisible: false },
  { title: "Trucks", url: "/dashboard/trucks", icon: Truck, permissionKey: "trucks", alwaysVisible: false },
  { title: "Employees", url: "/dashboard/employees", icon: Users, permissionKey: "employees", alwaysVisible: false },
  { title: "Schedule", url: "/dashboard/schedule", icon: Calendar, permissionKey: "schedule", alwaysVisible: false },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, permissionKey: null, alwaysVisible: true },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isElevated, setIsElevated] = useState(false);
  const [isBusinessManager, setIsBusinessManager] = useState(false);
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);

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

    const fetchRolesAndPermissions = async () => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map((r) => r.role) ?? [];
      const elevated = roles.includes("owner") || roles.includes("franchise_owner") || roles.includes("manager") || roles.includes("shift_lead");
      setIsElevated(elevated);
      setIsBusinessManager(roles.includes("business_manager"));

      if (!roles.includes("owner") && !roles.includes("franchise_owner")) {
        const { data: clockEmp } = await supabase
          .from("clock_employees")
          .select("id")
          .eq("linked_user_id", user.id)
          .maybeSingle();

        if (clockEmp) {
          const { data: perms } = await supabase
            .from("employee_permissions")
            .select("permission, granted")
            .eq("clock_employee_id", clockEmp.id)
            .eq("granted", true);

          setGrantedPermissions((perms || []).map((p) => p.permission));
        }
      } else {
        setGrantedPermissions([]);
      }
    };

    fetchRolesAndPermissions();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  if (loading) {
    return <AppLoadingScreen />;
  }

  const menuItems = allMenuItems.filter((item) => {
    if (item.alwaysVisible) return true;
    if (isElevated && (grantedPermissions.length === 0)) return true;
    if (item.permissionKey && grantedPermissions.includes(item.permissionKey)) return true;
    if (isBusinessManager && item.permissionKey === "hr_onboarding") return true;
    return false;
  });

  const currentItem = allMenuItems.find((item) =>
    item.url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(item.url)
  );
  const pageTitle = currentItem?.title ?? "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop sidebar — hidden on mobile */}
        <Sidebar className="border-r hidden md:flex" collapsible="icon">
          <SidebarContent>
            <div className="px-5 py-4 border-b border-sidebar-border">
              <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight">Wetzels of Augusta</h1>
              <p className="text-xs text-sidebar-accent-foreground/60 mt-0.5">Operations</p>
            </div>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="hover:bg-sidebar-accent transition-colors duration-150"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="mr-2.5 h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto px-4 py-3 border-t border-sidebar-border">
              <div className="text-xs text-sidebar-accent-foreground/50 mb-2 truncate">
                {user?.email}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs h-8"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-12 md:h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 md:px-6 sticky top-0 z-40">
            <SidebarTrigger className="hidden md:flex" />
            <h2 className="text-base font-semibold tracking-tight md:ml-3">{pageTitle}</h2>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 pb-safe-nav md:pb-6 animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileBottomNav menuItems={menuItems} />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
