import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Copy, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TRC20_ADDRESS = "TC2qeGTSsyDbUKtjENRoZpkYgNFgv8dfti";
const ERC20_ADDRESS = "0x88b54b1b94366500f84e3d11cc92bcb6c1c33af3";

const statusConfig = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  approved: { label: "معتمد", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
};

export default function Deposit() {
  const { isAuthenticated } = useAuth();
  const [network, setNetwork] = useState<"TRC20" | "ERC20">("TRC20");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");

  const { data: deposits, refetch } = trpc.wallet.getMyDeposits.useQuery(undefined, { enabled: isAuthenticated });
  const submitDeposit = trpc.wallet.submitDeposit.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الإيداع بنجاح! سيتم مراجعته من قبل الإدارة.");
      setTxHash("");
      setAmount("");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("تم نسخ العنوان!");
  };

  const walletAddress = network === "TRC20" ? TRC20_ADDRESS : ERC20_ADDRESS;

  if (!isAuthenticated) {
    return (
      <div className="px-4 pt-16 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">الإيداع</h2>
        <p className="text-muted-foreground">سجّل الدخول لإيداع الأموال</p>
        <a href={getLoginUrl()} className="block gradient-gold text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">
          تسجيل الدخول
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 space-y-5">
      <h1 className="text-xl font-bold">إيداع USDT</h1>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
        <p className="text-sm text-primary font-medium mb-1">كيفية الإيداع</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          أرسل USDT إلى العنوان أدناه، ثم أدخل رقم المعاملة (TxHash) والمبلغ. سيتم إضافة الرصيد لحسابك بعد التحقق من قبل الإدارة.
        </p>
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

      {/* Wallet Address */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">عنوان المحفظة ({network})</p>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            network === "TRC20" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
          )}>
            {network === "TRC20" ? "TRON" : "Ethereum"}
          </span>
        </div>
        <div className="bg-accent rounded-xl p-3 flex items-center gap-2">
          <p className="flex-1 text-xs font-mono text-foreground break-all text-right">{walletAddress}</p>
          <button
            onClick={() => copyAddress(walletAddress)}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0"
          >
            <Copy size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          ⚠️ أرسل فقط USDT على شبكة {network}
        </p>
      </div>

      {/* Deposit Form */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <p className="font-semibold text-sm">تأكيد الإيداع</p>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">رقم المعاملة (TxHash)</label>
          <input
            value={txHash}
            onChange={e => setTxHash(e.target.value)}
            placeholder="أدخل رقم المعاملة..."
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
            className="w-full bg-accent border border-border rounded-xl py-3 px-4 text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <button
          onClick={() => submitDeposit.mutate({ network, txHash, amount: parseFloat(amount) })}
          disabled={submitDeposit.isPending || !txHash || !amount || parseFloat(amount) <= 0}
          className="w-full gradient-gold text-background font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitDeposit.isPending ? "جاري الإرسال..." : "إرسال طلب الإيداع"}
        </button>
      </div>

      {/* Deposit History */}
      {deposits && deposits.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">سجل الإيداعات</h3>
          <div className="space-y-2">
            {deposits.map(d => {
              const config = statusConfig[d.status];
              const Icon = config.icon;
              return (
                <div key={d.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
                  <div className={cn("p-2.5 rounded-xl", config.bg)}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-sm">${parseFloat(d.amount).toLocaleString("en", { minimumFractionDigits: 2 })} USDT</p>
                    <p className="text-xs text-muted-foreground">{d.network} • {new Date(d.createdAt).toLocaleDateString("ar-SA")}</p>
                    {d.adminNote && <p className="text-xs text-muted-foreground mt-0.5">{d.adminNote}</p>}
                  </div>
                  <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
