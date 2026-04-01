import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallAppButton() {
  const { isInstallable, isInstalled, isIOS, install } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  // Always show the button
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
        title="تحميل التطبيق"
      >
        <Download size={18} />
      </button>

      {/* Modal with instructions */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">تحميل التطبيق</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {isIOS ? (
                <>
                  <p className="text-muted-foreground">على جهازك iOS:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>اضغط على <span className="font-semibold">مشاركة</span> (السهم لأعلى)</li>
                    <li>اختر <span className="font-semibold">أضف إلى الشاشة الرئيسية</span></li>
                    <li>أدخل اسم التطبيق: <span className="font-semibold">xxt Star</span></li>
                    <li>اضغط <span className="font-semibold">إضافة</span></li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">على جهازك Android:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>اضغط على <span className="font-semibold">⋮</span> (الثلاث نقاط)</li>
                    <li>اختر <span className="font-semibold">تثبيت التطبيق</span></li>
                    <li>اضغط <span className="font-semibold">تثبيت</span></li>
                  </ol>
                </>
              )}
            </div>

            {isInstallable && !isInstalled && (
              <button
                onClick={() => {
                  install();
                  setShowModal(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                تحميل الآن
              </button>
            )}

            {isInstalled && (
              <div className="bg-success/10 text-success p-3 rounded-lg text-sm font-medium text-center">
                ✓ التطبيق مثبت بالفعل
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-accent hover:bg-accent/80 text-foreground font-semibold py-2 rounded-lg transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
}
