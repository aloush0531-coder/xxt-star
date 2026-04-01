import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Wallet as WalletIcon, TrendingUp, ArrowUpRight, Clock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Wallet() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [hideBalance, setHideBalance] = useState(false);

  const { data: walletData, isLoading } = trpc.wallet.getMyWallet.useQuery(undefined, { enabled: isAuthenticated });
  const { data: prices } = trpc.market.getPrices.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <div className="px-4 pt-16 text-center space-y-4">
        <WalletIcon size={48} className="mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">محفظتي</h2>
        <p className="text-muted-foreground">سجّل الدخول لعرض محفظتك</p>
        <a href={getLoginUrl()} className="block gradient-gold text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">
          تسجيل الدخول
        </a>
      </div>
    );
  }

  const balance = walletData?.wallet ? parseFloat(walletData.wallet.usdtBalance) : 0;

  // Calculate total portfolio value
  const holdingsValue = walletData?.holdings?.reduce((acc, h) => {
    const coin = prices?.find(p => p.symbol.toUpperCase() === h.coinSymbol);
    return acc + (coin ? parseFloat(h.amount) * coin.current_price : 0);
  }, 0) ?? 0;

  const totalValue = balance + holdingsValue;

  return (
    <div className="px-4 pt-4 pb-2 space-y-4">
      {/* Balance Card */}
      <div className="gradient-gold rounded-2xl p-5 text-background shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium opacity-80">إجمالي المحفظة</p>
          <button onClick={() => setHideBalance(!hideBalance)} className="opacity-70 hover:opacity-100">
            {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-3xl font-bold">
          {hideBalance ? "••••••" : `$${totalValue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <div className="flex gap-4 mt-4 pt-4 border-t border-background/20">
          <div>
            <p className="text-xs opacity-70">رصيد USDT</p>
            <p className="font-semibold">
              {hideBalance ? "••••" : `$${balance.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div>
            <p className="text-xs opacity-70">قيمة العملات</p>
            <p className="font-semibold">
              {hideBalance ? "••••" : `$${holdingsValue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate("/deposit")} className="flex flex-col items-center gap-2 bg-card rounded-2xl p-3 border border-border hover:border-primary/40 transition-all">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><ArrowUpRight size={18} /></div>
          <span className="text-xs text-muted-foreground">إيداع</span>
        </button>
        <button onClick={() => navigate("/trade")} className="flex flex-col items-center gap-2 bg-card rounded-2xl p-3 border border-border hover:border-primary/40 transition-all">
          <div className="p-2 rounded-xl bg-success/10 text-success"><TrendingUp size={18} /></div>
          <span className="text-xs text-muted-foreground">تداول</span>
        </button>
        <button onClick={() => navigate("/transactions")} className="flex flex-col items-center gap-2 bg-card rounded-2xl p-3 border border-border hover:border-primary/40 transition-all">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Clock size={18} /></div>
          <span className="text-xs text-muted-foreground">السجل</span>
        </button>
      </div>

      {/* Holdings */}
      <div>
        <h3 className="font-semibold mb-3">العملات المحتفظ بها</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="text-right space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : walletData?.holdings && walletData.holdings.length > 0 ? (
          <div className="space-y-2">
            {walletData.holdings.map(h => {
              const coin = prices?.find(p => p.symbol.toUpperCase() === h.coinSymbol);
              const currentPrice = coin?.current_price ?? 0;
              const value = parseFloat(h.amount) * currentPrice;
              const avgPrice = parseFloat(h.avgBuyPrice);
              const pnl = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

              return (
                <button
                  key={h.id}
                  onClick={() => navigate(`/trade/${coin?.id ?? h.coinSymbol.toLowerCase()}`)}
                  className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 border border-border hover:border-primary/30 transition-all"
                >
                  {coin ? (
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                      {h.coinSymbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-sm">{h.coinName}</p>
                    <p className="text-xs text-muted-foreground">{parseFloat(h.amount).toFixed(6)} {h.coinSymbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {hideBalance ? "••••" : `$${value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                    <span className={cn("text-xs font-semibold", pnl >= 0 ? "text-success" : "text-danger")}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-border">
            <WalletIcon size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">لا توجد عملات في محفظتك</p>
            <button onClick={() => navigate("/trade")} className="mt-3 text-primary text-sm font-medium">
              ابدأ التداول الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
