import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Skeleton } from "@/components/ui/skeleton";
import { CandlestickChart } from "@/components/CandlestickChart";

export default function Trade() {
  const params = useParams<{ coinId?: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const { data: prices } = trpc.market.getPrices.useQuery(undefined, { refetchInterval: 15000 });
  const { data: walletData, refetch: refetchWallet } = trpc.wallet.getMyWallet.useQuery(undefined, { enabled: isAuthenticated });

  const utils = trpc.useUtils();
  const executeTrade = trpc.trading.executeTrade.useMutation({
    onSuccess: () => {
      toast.success(tradeType === "buy" ? "تم الشراء بنجاح!" : "تم البيع بنجاح!");
      setAmount("");
      refetchWallet();
      utils.wallet.getMyWallet.invalidate();
      utils.wallet.getMyTransactions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedCoin = useMemo(() => {
    if (!prices) return null;
    if (params.coinId) return prices.find(c => c.id === params.coinId) ?? prices[0];
    return prices[0];
  }, [prices, params.coinId]);

  const balance = walletData?.wallet ? parseFloat(walletData.wallet.usdtBalance) : 0;
  const holding = walletData?.holdings?.find(h => h.coinSymbol === selectedCoin?.symbol.toUpperCase());
  const holdingAmount = holding ? parseFloat(holding.amount) : 0;

  const amountNum = parseFloat(amount) || 0;
  const total = amountNum * (selectedCoin?.current_price ?? 0);

  const handleTrade = () => {
    if (!selectedCoin || !amountNum) return;
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    executeTrade.mutate({
      type: tradeType,
      coinSymbol: selectedCoin.symbol,
      coinName: selectedCoin.name,
      amount: amountNum,
      price: selectedCoin.current_price,
    });
  };

  const setPercent = (pct: number) => {
    if (!selectedCoin) return;
    if (tradeType === "buy") {
      const maxAmount = (balance * pct) / selectedCoin.current_price;
      setAmount(maxAmount.toFixed(8));
    } else {
      setAmount((holdingAmount * pct).toFixed(8));
    }
  };

  if (!prices) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 space-y-4">
      {/* Coin Selector */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
        {prices.slice(0, 8).map(coin => (
          <button
            key={coin.id}
            onClick={() => navigate(`/trade/${coin.id}`)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 transition-all",
              selectedCoin?.id === coin.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            )}
          >
            <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
            <span className="text-xs font-semibold uppercase">{coin.symbol}</span>
          </button>
        ))}
      </div>

      {/* Price Card */}
      {selectedCoin && (
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <img src={selectedCoin.image} alt={selectedCoin.name} className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <p className="font-bold text-lg">{selectedCoin.name}</p>
              <p className="text-xs text-muted-foreground uppercase">{selectedCoin.symbol}/USDT</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">
                ${selectedCoin.current_price.toLocaleString("en", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: selectedCoin.current_price < 1 ? 6 : 2
                })}
              </p>
              <span className={cn(
                "flex items-center justify-end gap-0.5 text-sm font-semibold",
                selectedCoin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
              )}>
                {selectedCoin.price_change_percentage_24h >= 0
                  ? <TrendingUp size={14} />
                  : <TrendingDown size={14} />}
                {selectedCoin.price_change_percentage_24h >= 0 ? "+" : ""}
                {selectedCoin.price_change_percentage_24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">أعلى 24س</p>
              <p className="font-semibold text-sm text-success">${selectedCoin.high_24h.toLocaleString("en")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">أدنى 24س</p>
              <p className="font-semibold text-sm text-danger">${selectedCoin.low_24h.toLocaleString("en")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Candlestick Chart */}
      {selectedCoin && (
        <div className="bg-card rounded-2xl p-4 border border-border overflow-hidden">
          <h3 className="text-sm font-semibold mb-4 text-foreground">الرسم البياني</h3>
          <CandlestickChart symbol={selectedCoin.symbol} interval="1h" />
        </div>
      )}

      {/* Trade Panel */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2">
          <button
            onClick={() => setTradeType("buy")}
            className={cn(
              "py-3 text-sm font-bold transition-all",
              tradeType === "buy" ? "bg-success text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            شراء
          </button>
          <button
            onClick={() => setTradeType("sell")}
            className={cn(
              "py-3 text-sm font-bold transition-all",
              tradeType === "sell" ? "bg-danger text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            بيع
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Balance Info */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {tradeType === "buy" ? "رصيد USDT" : `رصيد ${selectedCoin?.symbol.toUpperCase()}`}
            </span>
            <span className="font-semibold text-primary">
              {tradeType === "buy"
                ? `$${balance.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${holdingAmount.toFixed(6)} ${selectedCoin?.symbol.toUpperCase()}`}
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              الكمية ({selectedCoin?.symbol.toUpperCase()})
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-accent border border-border rounded-xl py-3 px-4 text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => setPercent(pct / 100)}
                className="py-1.5 text-xs font-medium bg-accent rounded-lg border border-border hover:border-primary/40 hover:text-primary transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between text-sm bg-accent rounded-xl p-3">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="font-bold text-foreground">
              ${total.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          {/* Submit Button */}
          {isAuthenticated ? (
            <button
              onClick={handleTrade}
              disabled={executeTrade.isPending || !amountNum || amountNum <= 0}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50",
                tradeType === "buy"
                  ? "bg-success hover:opacity-90"
                  : "bg-danger hover:opacity-90"
              )}
            >
              {executeTrade.isPending
                ? "جاري التنفيذ..."
                : tradeType === "buy"
                  ? `شراء ${selectedCoin?.symbol.toUpperCase()}`
                  : `بيع ${selectedCoin?.symbol.toUpperCase()}`}
            </button>
          ) : (
            <a
              href={getLoginUrl()}
              className="block w-full py-4 rounded-xl font-bold text-center gradient-gold text-background hover:opacity-90 transition-opacity"
            >
              سجّل الدخول للتداول
            </a>
          )}
        </div>
      </div>

      {/* Holdings */}
      {isAuthenticated && walletData?.holdings && walletData.holdings.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">محفظتي</h3>
            <button onClick={() => navigate("/wallet")} className="text-xs text-primary flex items-center gap-1">
              عرض الكل <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {walletData.holdings.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{h.coinSymbol}</span>
                <span className="text-sm text-muted-foreground">{parseFloat(h.amount).toFixed(6)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
