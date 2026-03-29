import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Bell, Users, TrendingUp, DollarSign, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig = {
  new_member: { label: "عضو جديد", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
  large_trade: { label: "صفقة كبيرة", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  deposit_request: { label: "طلب إيداع", icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  system: { label: "نظام", icon: Settings, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function AdminNotifications() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: notifications, refetch } = trpc.admin.getNotifications.useQuery(undefined, { enabled: user?.role === "admin" });

  const markRead = trpc.admin.markNotificationRead.useMutation({
    onSuccess: () => refetch(),
    onError: err => toast.error(err.message),
  });

  const unread = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight size={18} />
        </button>
        <h1 className="font-bold text-lg flex-1">الإشعارات</h1>
        {unread > 0 && (
          <span className="text-xs font-bold text-white bg-danger px-2 py-0.5 rounded-full">
            {unread} جديد
          </span>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-2">
        {notifications && notifications.length > 0 ? (
          notifications.map(n => {
            const config = typeConfig[n.type] ?? typeConfig.system;
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                className={cn(
                  "w-full flex items-start gap-3 rounded-2xl p-4 border text-right transition-all",
                  n.isRead
                    ? "bg-card border-border opacity-60"
                    : "bg-card border-primary/30 shadow-sm"
                )}
              >
                <div className={cn("p-2.5 rounded-xl flex-shrink-0 mt-0.5", config.bg)}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("ar-SA")} {new Date(n.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  <p className="font-semibold text-sm mt-0.5">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Bell size={40} className="mx-auto mb-3 opacity-40" />
            <p>لا توجد إشعارات</p>
          </div>
        )}
      </div>
    </div>
  );
}
