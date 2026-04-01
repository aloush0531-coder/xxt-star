import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowUpCircle, ArrowDownCircle, PlusCircle, MinusCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const typeConfig = {
  buy: { label: "شراء", icon: ArrowDownCircle, color: "text-success", bg: "bg-success/10" },
  sell: { label: "بيع", icon: ArrowUpCircle, color: "text-danger", bg: "bg-danger/10" },
  deposit: { label: "إيداع", icon: PlusCircle, color: "text-blue-400", bg: "bg-blue-400/10" },
  withdraw: { label: "سحب", icon: MinusCircle, color: "text-orange-400", bg: "bg-orange-400/10" },
  admin_credit: { label: "إضافة رصيد", icon: PlusCircle, color: "text-success", bg: "bg-success/10" },
  admin_debit: { label: "خصم رصيد", icon: MinusCircle, color: "text-danger", bg: "bg-danger/10" },
};

export default function Transactions() {
  const { isAuthenticated } = useAuth();
  const { data: txs, isLoading } = trpc.wallet.getMyTransactions.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="px-4 pt-16 text-center space-y-4">
        <DollarSign size={48} className="mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">سجل المعاملات</h2>
        <p className="text-muted-foreground">سجّل الدخول لعرض معاملاتك</p>
        <a href={getLoginUrl()} className="block gradient-gold text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">
          تسجيل الدخول
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 space-y-4">
      <h1 className="text-xl font-bold">سجل المعاملات</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="text-right space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : txs && txs.length > 0 ? (
        <div className="space-y-2">
          {txs.map(tx => {
            const config = typeConfig[tx.type] ?? typeConfig.deposit;
            const Icon = config.icon;
            const date = new Date(tx.createdAt);

            return (
              <div key={tx.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                <div className={cn("p-2.5 rounded-xl flex-shrink-0", config.bg)}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.coinName ? `${tx.coinName} ` : ""}
                    {date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                    {" "}
                    {date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("font-bold text-sm", tx.type === "buy" || tx.type === "admin_debit" || tx.type === "withdraw" ? "text-danger" : "text-success")}>
                    {tx.type === "buy" || tx.type === "admin_debit" || tx.type === "withdraw" ? "-" : "+"}
                    ${parseFloat(tx.total).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.status === "completed" ? "مكتمل" : tx.status === "pending" ? "قيد المعالجة" : "ملغي"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
          <DollarSign size={40} className="mx-auto mb-3 opacity-40" />
          <p>لا توجد معاملات بعد</p>
        </div>
      )}
    </div>
  );
}
