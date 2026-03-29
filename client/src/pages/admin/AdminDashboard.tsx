import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Users, DollarSign, Bell, ArrowLeftRight, CheckCircle, Clock, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role !== "admin") navigate("/");
  }, [isAuthenticated, user]);

  const { data: members } = trpc.admin.getMembers.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: deposits } = trpc.admin.getAllDeposits.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: unreadCount } = trpc.admin.getUnreadCount.useQuery(undefined, { enabled: user?.role === "admin", refetchInterval: 30000 });
  const { data: txs } = trpc.admin.getAllTransactions.useQuery({ limit: 5 }, { enabled: user?.role === "admin" });

  const totalMembers = members?.length ?? 0;
  const activeMembers = members?.filter(m => m.status === "active").length ?? 0;
  const pendingDeposits = deposits?.filter(d => d.status === "pending").length ?? 0;
  const totalBalance = members?.reduce((acc, m) => acc + parseFloat(m.balance), 0) ?? 0;

  const navItems = [
    { path: "/admin/members", label: "إدارة الأعضاء", icon: Users, badge: totalMembers },
    { path: "/admin/deposits", label: "طلبات الإيداع", icon: DollarSign, badge: pendingDeposits, badgeColor: "bg-yellow-400" },
    { path: "/admin/transactions", label: "جميع المعاملات", icon: ArrowLeftRight },
    { path: "/admin/notifications", label: "الإشعارات", icon: Bell, badge: unreadCount ?? 0, badgeColor: "bg-danger" },
  ];

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <ShieldCheck size={48} className="mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">غير مصرح بالوصول</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" />
          <span className="font-bold text-primary">لوحة التحكم</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg bg-card border border-border transition-colors">
            المنصة
          </button>
          <button onClick={logout} className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-danger transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "إجمالي الأعضاء", value: totalMembers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "الأعضاء النشطون", value: activeMembers, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
            { label: "طلبات إيداع معلقة", value: pendingDeposits, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "إجمالي الأرصدة", value: `$${totalBalance.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Navigation */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">الأقسام</h3>
          {navItems.map(({ path, label, icon: Icon, badge, badgeColor }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 border border-border hover:border-primary/40 transition-all text-right"
            >
              <div className="p-2.5 rounded-xl bg-accent">
                <Icon size={18} className="text-primary" />
              </div>
              <span className="flex-1 font-medium">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={cn("text-xs font-bold text-white px-2 py-0.5 rounded-full", badgeColor ?? "bg-muted-foreground")}>
                  {badge}
                </span>
              )}
              <span className="text-muted-foreground text-sm">›</span>
            </button>
          ))}
        </div>

        {/* Recent Transactions */}
        {txs && txs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">آخر المعاملات</h3>
              <button onClick={() => navigate("/admin/transactions")} className="text-xs text-primary">عرض الكل</button>
            </div>
            <div className="space-y-2">
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {tx.type === "buy" ? "شراء" : tx.type === "sell" ? "بيع" : tx.type === "deposit" ? "إيداع" : tx.type === "admin_credit" ? "إضافة رصيد" : "خصم رصيد"}
                      {tx.coinName ? ` ${tx.coinName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <span className={cn("font-bold text-sm", parseFloat(tx.total) > 0 ? "text-success" : "text-danger")}>
                    ${parseFloat(tx.total).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
