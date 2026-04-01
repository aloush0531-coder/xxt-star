import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function PriceChangeTag({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-xs font-semibold",
      isPositive ? "text-success" : "text-danger"
    )}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function Markets() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: prices, isLoading, refetch } = trpc.market.getPrices.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const filtered = prices?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="px-4 pt-4 pb-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الأسواق</h1>
        <button onClick={() => refetch()} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن عملة..."
          className="w-full bg-card border border-border rounded-xl py-2.5 pr-9 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Table Header */}
      <div className="flex items-center px-3 text-xs text-muted-foreground">
        <span className="flex-1">العملة</span>
        <span className="w-28 text-right">السعر</span>
        <span className="w-20 text-right">24س</span>
      </div>

      {/* Coin List */}
      <div className="space-y-1.5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="text-right space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-14 ml-auto" />
                </div>
              </div>
            ))
          : filtered.map((coin) => (
              <button
                key={coin.id}
                onClick={() => navigate(`/trade/${coin.id}`)}
                className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 border border-border hover:border-primary/30 transition-all"
              >
                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 text-right">
                  <p className="font-semibold text-sm">{coin.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{coin.symbol}/USDT</p>
                </div>
                <div className="w-28 text-right">
                  <p className="font-semibold text-sm">
                    ${coin.current_price.toLocaleString("en", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: coin.current_price < 1 ? 6 : 2
                    })}
                  </p>
                  <div className="flex justify-end mt-0.5">
                    <PriceChangeTag value={coin.price_change_percentage_24h} />
                  </div>
                </div>
              </button>
            ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>لا توجد نتائج لـ "{search}"</p>
        </div>
      )}
    </div>
  );
}
