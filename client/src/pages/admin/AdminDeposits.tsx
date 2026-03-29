import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "معلق", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  approved: { label: "معتمد", color: "text-success", bg: "bg-success/10" },
  rejected: { label: "مرفوض", color: "text-danger", bg: "bg-danger/10" },
};

export default function AdminDeposits() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});

  const { data: deposits, refetch } = trpc.admin.getAllDeposits.useQuery(undefined, { enabled: user?.role === "admin" });

  const approve = trpc.admin.approveDeposit.useMutation({
    onSuccess: () => { toast.success("تم اعتماد الإيداع وإضافة الرصيد"); refetch(); },
    onError: err => toast.error(err.message),
  });

  const reject = trpc.admin.rejectDeposit.useMutation({
    onSuccess: () => { toast.success("تم رفض الإيداع"); refetch(); },
    onError: err => toast.error(err.message),
  });

  const pendingDeposits = deposits?.filter(d => d.status === "pending") ?? [];
  const otherDeposits = deposits?.filter(d => d.status !== "pending") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight size={18} />
        </button>
        <h1 className="font-bold text-lg flex-1">طلبات الإيداع</h1>
        {pendingDeposits.length > 0 && (
          <span className="text-xs font-bold text-white bg-yellow-500 px-2 py-0.5 rounded-full">
            {pendingDeposits.length} معلق
          </span>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Pending Deposits */}
        {pendingDeposits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 mb-2">طلبات تحتاج مراجعة</h3>
            <div className="space-y-3">
              {pendingDeposits.map(d => (
                <div key={d.id} className="bg-card rounded-2xl border border-yellow-400/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Clock size={12} /> معلق
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">${parseFloat(d.amount).toLocaleString("en", { minimumFractionDigits: 2 })} USDT</p>
                      <p className="text-xs text-muted-foreground">{d.network}</p>
                    </div>
                  </div>

                  <div className="bg-accent rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">العضو</span>
                      <span className="font-medium">{(d as any).userName ?? `#${d.userId}`}</span>
                    </div>
                    {d.txHash && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">TxHash</span>
                        <span className="font-mono text-xs truncate max-w-[180px]">{d.txHash}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">التاريخ</span>
                      <span>{new Date(d.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>

                  <input
                    value={adminNote[d.id] ?? ""}
                    onChange={e => setAdminNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                    placeholder="ملاحظة للعضو (اختياري)"
                    className="w-full bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => approve.mutate({ depositId: d.id, adminNote: adminNote[d.id] })}
                      disabled={approve.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-success text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> اعتماد وإضافة الرصيد
                    </button>
                    <button
                      onClick={() => reject.mutate({ depositId: d.id, adminNote: adminNote[d.id] })}
                      disabled={reject.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-danger/10 text-danger border border-danger/30 font-semibold text-sm hover:bg-danger/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={16} /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Deposits */}
        {otherDeposits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">السجل السابق</h3>
            <div className="space-y-2">
              {otherDeposits.map(d => {
                const config = statusConfig[d.status];
                return (
                  <div key={d.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                    <div className={cn("p-2.5 rounded-xl", config.bg)}>
                      <DollarSign size={16} className={config.color} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-semibold text-sm">${parseFloat(d.amount).toLocaleString("en", { minimumFractionDigits: 2 })} USDT</p>
                      <p className="text-xs text-muted-foreground">
                        {(d as any).userName ?? `#${d.userId}`} • {d.network} • {new Date(d.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                      {d.adminNote && <p className="text-xs text-muted-foreground">{d.adminNote}</p>}
                    </div>
                    <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!deposits || deposits.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign size={40} className="mx-auto mb-3 opacity-40" />
            <p>لا توجد طلبات إيداع</p>
          </div>
        )}
      </div>
    </div>
  );
}
