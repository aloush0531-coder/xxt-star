import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending: { icon: Clock, label: 'قيد الانتظار', color: 'text-yellow-500' },
  approved: { icon: CheckCircle, label: 'معتمد', color: 'text-green-500' },
  rejected: { icon: XCircle, label: 'مرفوض', color: 'text-red-500' },
  completed: { icon: CheckCircle, label: 'مكتمل', color: 'text-blue-500' },
};

export function AdminWithdrawals() {
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed' | undefined>('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<number | null>(null);
  const [fee, setFee] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: withdrawals, isLoading, refetch } = trpc.withdrawals.allWithdrawals.useQuery({ status: selectedStatus });
  const { data: details } = trpc.withdrawals.getDetails.useQuery(
    { withdrawalId: selectedWithdrawal ?? 0 },
    { enabled: selectedWithdrawal !== null }
  );

  const approveMutation = trpc.withdrawals.approve.useMutation({
    onSuccess: () => {
      toast.success('تم اعتماد طلب السحب');
      setSelectedWithdrawal(null);
      setFee('');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.withdrawals.reject.useMutation({
    onSuccess: () => {
      toast.success('تم رفض طلب السحب');
      setSelectedWithdrawal(null);
      setRejectReason('');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApprove = () => {
    if (!selectedWithdrawal) return;
    approveMutation.mutate({
      withdrawalId: selectedWithdrawal,
      fee: fee ? parseFloat(fee) : undefined,
    });
  };

  const handleReject = () => {
    if (!selectedWithdrawal) return;
    rejectMutation.mutate({
      withdrawalId: selectedWithdrawal,
      adminNote: rejectReason || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'completed'] as const).map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            onClick={() => setSelectedStatus(status)}
            className="text-sm"
          >
            {statusConfig[status].label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawals List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : withdrawals?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد طلبات سحب</div>
          ) : (
            withdrawals?.map((w) => {
              const StatusIcon = statusConfig[w.status as keyof typeof statusConfig]?.icon || Clock;
              return (
                <Card
                  key={w.id}
                  className={`p-4 cursor-pointer transition-all ${selectedWithdrawal === w.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedWithdrawal(w.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={`w-4 h-4 ${statusConfig[w.status as keyof typeof statusConfig]?.color}`} />
                        <h3 className="font-semibold">{w.userName}</h3>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>المبلغ: <span className="text-foreground font-medium">${parseFloat(w.amount).toFixed(2)}</span></div>
                        <div>الشبكة: <span className="text-foreground font-medium">{w.network}</span></div>
                        <div className="truncate">العنوان: <span className="text-foreground font-mono text-xs">{w.address}</span></div>
                        <div className="text-xs">{new Date(w.createdAt).toLocaleString('ar-SA')}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Details Panel */}
        {selectedWithdrawal && details && (
          <Card className="p-6 h-fit sticky top-4">
            <h3 className="font-bold text-lg mb-4">تفاصيل الطلب</h3>
            
            <div className="space-y-4 mb-6">
              <div className="border-b pb-3">
                <div className="text-sm text-muted-foreground">اسم المستخدم</div>
                <div className="font-semibold">{details.userName}</div>
              </div>

              <div className="border-b pb-3">
                <div className="text-sm text-muted-foreground">عنوان المحفظة</div>
                <div className="font-mono text-xs break-all">{details.address}</div>
              </div>

              <div className="border-b pb-3">
                <div className="text-sm text-muted-foreground">المبلغ المطلوب</div>
                <div className="text-2xl font-bold text-green-600">${parseFloat(details.amount).toFixed(2)}</div>
              </div>

              <div className="border-b pb-3">
                <div className="text-sm text-muted-foreground">الشبكة</div>
                <div className="font-semibold">{details.network}</div>
              </div>

              <div className="border-b pb-3">
                <div className="text-sm text-muted-foreground">التاريخ</div>
                <div className="font-semibold">{new Date(details.createdAt).toLocaleString('ar-SA')}</div>
              </div>

              {details.status === 'pending' && (
                <>
                  <div className="border-b pb-3">
                    <label className="text-sm text-muted-foreground block mb-2">رسوم الخصم (اختياري)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {fee && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                      <div className="text-sm mb-2">
                        <div className="text-muted-foreground">المبلغ الصافي</div>
                        <div className="text-lg font-bold text-blue-600">
                          ${(parseFloat(details.amount) - parseFloat(fee)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {details.status === 'pending' && (
                <div className="border-b pb-3">
                  <label className="text-sm text-muted-foreground block mb-2">سبب الرفض (عند الرفض)</label>
                  <Input
                    placeholder="أدخل سبب الرفض..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}

              {details.adminNote && (
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-muted-foreground flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">ملاحظة المسؤول</div>
                      <div>{details.adminNote}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {details.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ✓ قبول
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  ✕ رفض
                </Button>
              </div>
            )}

            {details.status !== 'pending' && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                هذا الطلب {statusConfig[details.status as keyof typeof statusConfig]?.label}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
