import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Facebook,
  Settings,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Video,
  Instagram,
  Sun,
  Moon,
  AtSign,
  CalendarClock,
} from "lucide-react";

const XIcon = (props: any) => (
  <svg viewBox="0 0 24 24" className={props.className || "w-5 h-5"} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navGroups = [
  {
    label: "Main",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "YouTube",
    items: [
      { to: "/admin/upload", icon: Upload, label: "Upload Video" },
      { to: "/admin/bulk-upload", icon: Youtube, label: "Bulk Upload" },
      { to: "/admin/my-videos", icon: Video, label: "My Videos" },
    ],
  },
  {
    label: "Social",
    items: [
      { to: "/admin/social", icon: Facebook, label: "Facebook & IG" },
      { to: "/admin/fb-auto-post", icon: CalendarClock, label: "FB Auto-Post" },
      { to: "/admin/ig-auto-reply", icon: Instagram, label: "IG Auto-Reply" },
      { to: "/admin/twitter", icon: XIcon, label: "X (Twitter)" },
      { to: "/admin/threads", icon: AtSign, label: "Threads" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];


const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark") ||
      !document.documentElement.classList.contains("light");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
            <Youtube className="w-5 h-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-display font-bold text-foreground text-lg whitespace-nowrap"
              >
                COMBO_WICK
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-1"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 flex-shrink-0 transition-colors",
                        isActive ? "text-primary" : ""
                      )}
                    />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="whitespace-nowrap"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: theme + collapse */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          title="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-nowrap">
                {isDark ? "Light Mode" : "Dark Mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
