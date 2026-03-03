import {
  BookOpen,
  Bus,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "fee-billing", label: "Fee / Billing", icon: CreditCard },
  { id: "fee-update", label: "Fee Update", icon: RefreshCw },
  { id: "fee-report", label: "Fee Report", icon: FileText },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "report-card", label: "Report Card", icon: BookOpen },
];

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  currentPage,
  onNavigate,
  onLogout,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (page: Page) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
            <span
              className="text-xs font-extrabold"
              style={{ color: "oklch(0.28 0.09 155)" }}
            >
              GPIS
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-bold text-sm leading-tight">
              Global Pride
            </p>
            <p className="text-sidebar-foreground/70 text-xs">
              International School
            </p>
          </div>
        </div>
        <div className="mt-3 px-2 py-1 rounded-md text-xs text-sidebar-foreground/60 bg-sidebar-accent/30 text-center">
          AY 2026–2027
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-white"}`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-white/70" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/75 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className="sidebar-nav hidden lg:flex flex-col w-64 shrink-0 no-print"
        style={{ background: "oklch(var(--sidebar))" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden no-print w-full h-full border-0 cursor-default"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`sidebar-nav fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col lg:hidden no-print transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "oklch(var(--sidebar))" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="text-white font-bold text-sm">GPIS Menu</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="top-header-bar no-print h-14 shrink-0 flex items-center justify-between px-4 border-b border-border bg-card shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">
                {navItems.find((n) => n.id === currentPage)?.label ??
                  "Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Global Pride International School
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              AY 2026–2027
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="no-print shrink-0 px-4 lg:px-6 py-3 border-t border-border bg-card text-center">
          <p className="text-xs text-muted-foreground">
            © 2026. Built with <span className="text-red-400">♥</span> using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
