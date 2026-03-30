import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { TrendingUp, TrendingDown, ArrowUpRight, Wallet, BarChart2, RefreshCw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { Skeleton } from "@/components/ui/skeleton";
import MiningBar from "@/components/MiningBar";

function PriceChangeTag({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={cn(
      "text-xs font-semibold px-1.5 py-0.5 rounded",
      isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
    )}>
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: prices, isLoading, refetch } = trpc.market.getPrices.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: walletData } = trpc.wallet.getMyWallet.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const topCoins = prices?.slice(0, 5) ?? [];
  const balance = walletData?.wallet ? parseFloat(walletData.wallet.usdtBalance) : 0;

  return (
    <div className="px-4 pt-4 pb-2 space-y-5">
      {/* Welcome Banner */}
      {isAuthenticated ? (
        <div className="gradient-gold rounded-2xl p-5 text-background shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">مرحباً، {user?.name ?? "مستخدم"}</p>
              <p className="text-2xl font-bold mt-1">${balance.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs opacity-70 mt-0.5">رصيد USDT</p>
            </div>
            <div className="bg-background/20 rounded-xl p-2.5">
              <Wallet size={24} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate("/deposit")}
              className="flex-1 bg-background/20 hover:bg-background/30 rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              إيداع
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="flex-1 bg-background/20 hover:bg-background/30 rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              محفظتي
            </button>
            <button
              onClick={() => navigate("/trade")}
              className="flex-1 bg-background/20 hover:bg-background/30 rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              تداول
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 bg-card border border-border text-center space-y-3">
          <div className="w-16 h-16 gradient-gold rounded-full flex items-center justify-center mx-auto">
            <Star size={28} className="text-background" />
          </div>
          <h2 className="text-xl font-bold">مرحباً في xxt Star</h2>
          <p className="text-muted-foreground text-sm">منصة التداول الأكثر احترافية</p>
          <a
            href={getLoginUrl()}
            className="block w-full gradient-gold text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            ابدأ التداول الآن
          </a>
        </div>
      )}

      {/* Mining Bar */}
      {isAuthenticated && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <MiningBar />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "الأسواق", icon: BarChart2, path: "/markets", color: "text-blue-400" },
          { label: "تداول", icon: TrendingUp, path: "/trade", color: "text-success" },
          { label: "إيداع", icon: ArrowUpRight, path: "/deposit", color: "text-primary" },
          { label: "محفظة", icon: Wallet, path: "/wallet", color: "text-purple-400" },
        ].map(({ label, icon: Icon, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-2 bg-card rounded-2xl p-3 border border-border hover:border-primary/40 transition-all"
          >
            <div className={cn("p-2 rounded-xl bg-accent", color)}>
              <Icon size={18} />
            </div>
            <span className="text-xs text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Market Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">السوق الآن</h3>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))
            : topCoins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => navigate(`/trade/${coin.id}`)}
                  className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 border border-border hover:border-primary/30 transition-all text-right"
                >
                  <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-sm">{coin.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{coin.symbol}/USDT</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      ${coin.current_price.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 6 : 2 })}
                    </p>
                    <div className="flex justify-end mt-0.5">
                      <PriceChangeTag value={coin.price_change_percentage_24h} />
                    </div>
                  </div>
                </button>
              ))}
        </div>

        <button
          onClick={() => navigate("/markets")}
          className="w-full mt-3 py-3 rounded-2xl border border-border text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-all"
        >
          عرض جميع العملات
        </button>
      </div>
    </div>
  );
}
