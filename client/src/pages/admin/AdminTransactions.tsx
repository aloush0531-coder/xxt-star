import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  buy: "شراء", sell: "بيع", deposit: "إيداع",
  withdraw: "سحب", admin_credit: "إضافة رصيد", admin_debit: "خصم رصيد",
};

export default function AdminTransactions() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: txs, isLoading } = trpc.admin.getAllTransactions.useQuery({ limit: 200 }, { enabled: user?.role === "admin" });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight size={18} />
        </button>
        <h1 className="font-bold text-lg flex-1">جميع المعاملات</h1>
        <span className="text-xs text-muted-foreground bg-card border border-border px-2 py-1 rounded-lg">
          {txs?.length ?? 0}
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : txs && txs.length > 0 ? (
          txs.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
              <div className={cn(
                "p-2.5 rounded-xl flex-shrink-0",
                tx.type === "buy" ? "bg-success/10" : tx.type === "sell" ? "bg-danger/10" : "bg-primary/10"
              )}>
                <ArrowLeftRight size={16} className={cn(
                  tx.type === "buy" ? "text-success" : tx.type === "sell" ? "text-danger" : "text-primary"
                )} />
              </div>
              <div className="flex-1 text-right">
                <p className="font-semibold text-sm">
                  {typeLabels[tx.type] ?? tx.type}
                  {tx.coinName ? ` ${tx.coinName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  عضو #{tx.userId} • {new Date(tx.createdAt).toLocaleDateString("ar-SA")} {new Date(tx.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {tx.note && <p className="text-xs text-muted-foreground">{tx.note}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-foreground">
                  ${parseFloat(tx.total).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {tx.status === "completed" ? "مكتمل" : tx.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-40" />
            <p>لا توجد معاملات</p>
          </div>
        )}
      </div>
    </div>
  );
}
