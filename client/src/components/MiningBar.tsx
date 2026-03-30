import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function MiningBar() {
  const { data: progress, refetch } = trpc.wallet.getMiningProgress.useQuery();
  const claimMutation = trpc.wallet.claimMining.useMutation({
    onSuccess: () => {
      toast.success("تم استلام المكافأة!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!progress?.nextClaimTime) return;

    const updateTimer = () => {
      const now = new Date();
      const target = new Date(progress.nextClaimTime);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("اكتمل!");
        refetch();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [progress?.nextClaimTime, refetch]);

  if (!progress) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          <span className="text-sm font-semibold">التعدين اليومي</span>
        </div>
        <span className="text-xs text-muted-foreground">{timeLeft}</span>
      </div>

      <div className="w-full bg-card border border-border rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{progress.progress}%</span>
        <span className="text-yellow-400 font-semibold">$80 USDT</span>
      </div>

      {progress.progress === 100 && !progress.claimed && (
        <Button
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
        >
          {claimMutation.isPending ? "جاري..." : "استلام المكافأة"}
        </Button>
      )}

      {progress.claimed && (
        <div className="text-center text-xs text-success font-semibold py-2">
          ✓ تم استلام المكافأة اليوم
        </div>
      )}
    </div>
  );
}
