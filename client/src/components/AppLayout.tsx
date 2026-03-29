import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Home, BarChart2, TrendingUp, Wallet, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", label: "الرئيسية", icon: Home },
  { path: "/markets", label: "الأسواق", icon: BarChart2 },
  { path: "/trade", label: "تداول", icon: TrendingUp },
  { path: "/wallet", label: "محفظتي", icon: Wallet },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isAdminPage = location.startsWith("/admin");

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center">
            <span className="text-xs font-bold text-background">XXT</span>
          </div>
          <span className="font-bold text-primary text-lg tracking-wide">xxt Star</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ShieldCheck size={18} />
            </button>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <User size={16} className="text-foreground" />
              </div>
              <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                {user?.name ?? "مستخدم"}
              </span>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              تسجيل الدخول
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-safe">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 glass border-t border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isActive ? "bg-primary/15" : ""
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
