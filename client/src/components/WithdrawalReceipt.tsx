import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Withdrawal } from '@shared/types';

interface WithdrawalReceiptProps {
  withdrawal: Withdrawal & { userName?: string; netAmount?: number };
  userInfo?: { name?: string | null; email?: string | null };
}

const statusConfig = {
  pending: { icon: Clock, label: 'قيد الانتظار', color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  approved: { icon: CheckCircle, label: 'معتمد', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  rejected: { icon: XCircle, label: 'مرفوض', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950' },
  completed: { icon: CheckCircle, label: 'مكتمل', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
};

export function WithdrawalReceipt({ withdrawal, userInfo }: WithdrawalReceiptProps) {
  const StatusIcon = statusConfig[withdrawal.status as keyof typeof statusConfig]?.icon || Clock;
  const config = statusConfig[withdrawal.status as keyof typeof statusConfig];
  const amount = parseFloat(withdrawal.amount);
  const fee = parseFloat(withdrawal.fee || '0');
  const netAmount = amount - fee;

  return (
    <div className={`p-6 rounded-2xl border border-border bg-card space-y-6`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold">وصل السحب</h2>
          <p className="text-sm text-muted-foreground">#{withdrawal.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-6 h-6 ${config?.color}`} />
          <span className="font-semibold">{config?.label}</span>
        </div>
      </div>

      {/* User Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">اسم المستخدم</div>
          <div className="font-semibold">{userInfo?.name || userInfo?.email || 'مجهول'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">التاريخ</div>
          <div className="font-semibold">{new Date(withdrawal.createdAt).toLocaleString('ar-SA')}</div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="bg-accent p-4 rounded-xl border border-border">
        <div className="text-sm text-muted-foreground mb-2">عنوان المحفظة ({withdrawal.network})</div>
        <div className="font-mono text-xs break-all text-foreground">{withdrawal.address}</div>
      </div>

      {/* Amount Details */}
      <div className="space-y-3 bg-accent p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">المبلغ المطلوب</span>
          <span className="font-semibold text-lg">${amount.toFixed(2)}</span>
        </div>

        {fee > 0 && (
          <>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">رسوم الخصم</span>
                <span className="font-semibold text-red-600">-${fee.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">المبلغ الصافي</span>
                <span className="font-bold text-xl text-green-600">${netAmount.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Network Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">شبكة التحويل</div>
          <div className="font-semibold">{withdrawal.network}</div>
        </div>
        <div>
          <div className="text-muted-foreground">حالة الطلب</div>
          <div className="font-semibold">{config?.label}</div>
        </div>
      </div>

      {/* Status Messages */}
      {withdrawal.status === 'pending' && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-yellow-900 dark:text-yellow-100">قيد المراجعة</div>
            <div className="text-yellow-800 dark:text-yellow-200">يتم مراجعة طلب السحب من قبل فريق الدعم</div>
          </div>
        </div>
      )}

      {withdrawal.status === 'approved' && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-xl flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-green-900 dark:text-green-100">تم الموافقة</div>
            <div className="text-green-800 dark:text-green-200">سيتم تحويل المبلغ قريباً إلى محفظتك</div>
          </div>
        </div>
      )}

      {withdrawal.status === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-xl flex gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-red-900 dark:text-red-100">تم الرفض</div>
            <div className="text-red-800 dark:text-red-200">
              {withdrawal.adminNote ? `السبب: ${withdrawal.adminNote}` : 'تم رفض طلب السحب. يرجى التواصل مع الدعم'}
            </div>
          </div>
        </div>
      )}

      {withdrawal.status === 'completed' && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-blue-900 dark:text-blue-100">مكتمل</div>
            <div className="text-blue-800 dark:text-blue-200">
              تم تحويل المبلغ بنجاح
              {withdrawal.txHash && <div className="font-mono text-xs mt-1">Hash: {withdrawal.txHash}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
        <p>هذا الوصل يثبت طلب السحب الخاص بك</p>
        <p>احفظ هذا الوصل للرجوع إليه لاحقاً</p>
      </div>
    </div>
  );
}
