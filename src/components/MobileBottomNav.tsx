import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Clock, ClipboardCheck, Package, Settings, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  menuItems: Array<{
    title: string;
    url: string;
    icon: React.ElementType;
    permissionKey: string | null;
    alwaysVisible: boolean;
  }>;
}

const iconMap: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  "Time Clock": Clock,
  Compliance: ClipboardCheck,
  Inventory: Package,
  Settings: Settings,
};

const MobileBottomNav = ({ menuItems }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Show max 5 items in bottom nav — prioritize key ones
  const priorityKeys = ["Dashboard", "Time Clock", "Compliance", "Inventory", "Settings"];
  const navItems = priorityKeys
    .map((key) => menuItems.find((m) => m.title === key))
    .filter(Boolean) as typeof menuItems;

  // If we have fewer than 5 from priority, fill from remaining
  if (navItems.length < 5) {
    const remaining = menuItems.filter((m) => !priorityKeys.includes(m.title));
    navItems.splice(navItems.length - 1, 0, ...remaining.slice(0, 5 - navItems.length));
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden"
      style={{ paddingBottom: "var(--safe-area-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.url === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.url);

          const Icon = item.icon;

          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] touch-target transition-colors duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-150",
                  isActive && "scale-105"
                )}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.title === "Time Clock" ? "Clock" : item.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
