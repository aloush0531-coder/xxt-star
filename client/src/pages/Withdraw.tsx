import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Copy, CheckCircle, Clock, XCircle, AlertCircle, QrCode, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { WithdrawalReceipt } from "@/components/WithdrawalReceipt";

const statusConfig = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  approved: { label: "معتمد", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
};

export default function Withdraw() {
  const { isAuthenticated, user } = useAuth();
  const [network, setNetwork] = useState<"TRC20" | "ERC20">("TRC20");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<number | null>(null);

  const { data: wallet } = trpc.wallet.getMyWallet.useQuery(undefined, { enabled: isAuthenticated });
  const { data: withdrawals, refetch } = trpc.withdrawals.myWithdrawals.useQuery(undefined, { enabled: isAuthenticated });
  const submitWithdraw = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب السحب بنجاح!");
      setAddress("");
      setAmount("");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("تم نسخ العنوان!");
  };

  const balance = wallet?.wallet ? parseFloat(wallet.wallet.usdtBalance) : 0;

  if (!isAuthenticated) {
    return (
      <div className="px-4 pt-16 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">السحب</h2>
        <p className="text-muted-foreground">سجّل الدخول لسحب الأموال</p>
        <a href={getLoginUrl()} className="block gradient-gold text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">
          تسجيل الدخول
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 space-y-5">
      <h1 className="text-xl font-bold">سحب الأموال</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-4 border border-primary/30">
        <p className="text-sm text-muted-foreground mb-1">الرصيد المتاح</p>
        <p className="text-3xl font-bold text-primary">${balance.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</p>
      </div>

      {/* Network Selector */}
      <div>
        <p className="text-sm font-medium mb-2">اختر الشبكة</p>
        <div className="grid grid-cols-2 gap-2">
          {(["TRC20", "ERC20"] as const).map(net => (
            <button
              key={net}
              onClick={() => setNetwork(net)}
              className={cn(
                "py-3 rounded-xl border font-semibold text-sm transition-all",
                network === net
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              )}
            >
              {net === "TRC20" ? "TRC20 (TRON)" : "ERC20 (Ethereum)"}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <p className="font-semibold text-sm">طلب سحب جديد</p>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">عنوان المحفظة ({network})</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={network === "TRC20" ? "T..." : "0x..."}
            className="w-full bg-accent border border-border rounded-xl py-3 px-4 text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">المبلغ (USDT)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            max={balance}
            className="w-full bg-accent border border-border rounded-xl py-3 px-4 text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: ${balance.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
        </div>

        <button
          onClick={() => submitWithdraw.mutate({ network, address, amount })}
          disabled={submitWithdraw.isPending || !address || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
          className="w-full gradient-gold text-background font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitWithdraw.isPending ? "جاري الإرسال..." : "طلب السحب"}
        </button>
      </div>

      {/* QR Code Display */}
      {showQR && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowQR(false)} className="text-muted-foreground hover:text-foreground">
              <ArrowRight size={18} />
            </button>
            <p className="font-semibold">باركود {network}</p>
          </div>
          <div className="flex justify-center bg-white p-4 rounded-xl">
            <QRCode value={address || "https://xxtstar.app"} size={200} />
          </div>
          <button
            onClick={() => copyAddress(address)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
          >
            <Copy size={16} /> نسخ العنوان
          </button>
        </div>
      )}

      {/* Withdrawal History */}
      {withdrawals && withdrawals.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">سجل الطلبات</h3>
          <div className="space-y-3">
            {withdrawals.map(w => {
              const config = statusConfig[w.status];
              const Icon = config.icon;
              const isExpanded = expandedReceipt === w.id;
              return (
                <div key={w.id}>
                  <button
                    onClick={() => setExpandedReceipt(isExpanded ? null : w.id)}
                    className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className={cn("p-2.5 rounded-xl", config.bg)}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-semibold text-sm">${parseFloat(w.amount).toLocaleString("en", { minimumFractionDigits: 2 })} USDT</p>
                      <p className="text-xs text-muted-foreground">{w.network} • {new Date(w.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
                      <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>
                  {isExpanded && user && (
                    <div className="mt-3">
                      <WithdrawalReceipt withdrawal={w} userInfo={user} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
