import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Search, UserCheck, UserX, PlusCircle, MinusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminMembers() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  const { data: members, refetch } = trpc.admin.getMembers.useQuery(undefined, { enabled: user?.role === "admin" });
  const utils = trpc.useUtils();

  const setStatus = trpc.admin.setMemberStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة العضو"); refetch(); },
    onError: err => toast.error(err.message),
  });

  const adjustBalance = trpc.admin.adjustBalance.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل الرصيد بنجاح");
      setAdjustAmount("");
      setAdjustNote("");
      setShowAdjust(false);
      setSelectedMember(null);
      refetch();
      utils.admin.getMembers.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const filtered = members?.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const selectedMemberData = members?.find(m => m.id === selectedMember);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight size={18} />
        </button>
        <h1 className="font-bold text-lg flex-1">إدارة الأعضاء</h1>
        <span className="text-xs text-muted-foreground bg-card border border-border px-2 py-1 rounded-lg">
          {members?.length ?? 0} عضو
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم أو بريد إلكتروني..."
            className="w-full bg-card border border-border rounded-xl py-2.5 pr-9 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {filtered.map(member => (
            <div key={member.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-sm">{member.name ?? "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">{member.email ?? member.openId}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    member.status === "active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    {member.status === "active" ? "نشط" : "محظور"}
                  </span>
                  {member.role === "admin" && (
                    <span className="mr-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      مسؤول
                    </span>
                  )}
                </div>
              </div>

              {/* Balance & Date */}
              <div className="flex items-center justify-between bg-accent rounded-xl px-3 py-2">
                <span className="text-xs text-muted-foreground">الرصيد</span>
                <span className="font-bold text-sm text-primary">
                  ${parseFloat(member.balance).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
              </div>

              <div className="text-xs text-muted-foreground text-right">
                انضم: {new Date(member.createdAt).toLocaleDateString("ar-SA")}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMember(member.id);
                    setShowAdjust(true);
                    setAdjustAmount("");
                    setAdjustNote("");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  <PlusCircle size={14} />
                  تعديل الرصيد
                </button>
                {member.role !== "admin" && (
                  <button
                    onClick={() => setStatus.mutate({ userId: member.id, status: member.status === "active" ? "banned" : "active" })}
                    disabled={setStatus.isPending}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors",
                      member.status === "active"
                        ? "bg-danger/10 text-danger hover:bg-danger/20"
                        : "bg-success/10 text-success hover:bg-success/20"
                    )}
                  >
                    {member.status === "active" ? <><UserX size={14} /> حظر</> : <><UserCheck size={14} /> تفعيل</>}
                  </button>
                )}
              </div>

              {/* Adjust Balance Panel */}
              {showAdjust && selectedMember === member.id && (
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-sm font-semibold">تعديل رصيد {member.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAdjustAmount(prev => prev.startsWith("-") ? prev.slice(1) : prev)}
                      className="py-2 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <PlusCircle size={14} /> إضافة
                    </button>
                    <button
                      onClick={() => setAdjustAmount(prev => prev.startsWith("-") ? prev : `-${prev}`)}
                      className="py-2 rounded-xl bg-danger/10 text-danger text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <MinusCircle size={14} /> خصم
                    </button>
                  </div>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="المبلغ (موجب = إضافة، سالب = خصم)"
                    className="w-full bg-accent border border-border rounded-xl py-2.5 px-3 text-sm text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <input
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    placeholder="ملاحظة (اختياري)"
                    className="w-full bg-accent border border-border rounded-xl py-2.5 px-3 text-sm text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjustBalance.mutate({ userId: member.id, amount: parseFloat(adjustAmount), note: adjustNote || undefined })}
                      disabled={adjustBalance.isPending || !adjustAmount}
                      className="flex-1 gradient-gold text-background font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      {adjustBalance.isPending ? "جاري..." : "تأكيد"}
                    </button>
                    <button
                      onClick={() => { setShowAdjust(false); setSelectedMember(null); }}
                      className="px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User size={40} className="mx-auto mb-3 opacity-40" />
            <p>لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  );
}
