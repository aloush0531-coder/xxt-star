import { Download } from 'lucide-react';

export function DownloadButton() {
  const handleClick = () => {
    // For Android
    if (/Android/.test(navigator.userAgent)) {
      alert('اضغط على ⋮ (الثلاث نقاط) ثم اختر "تثبيت التطبيق"');
      return;
    }
    
    // For iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      alert('اضغط على مشاركة ثم اختر "أضف إلى الشاشة الرئيسية"');
      return;
    }
    
    // For other browsers
    alert('استخدم متصفح Chrome أو Safari لتحميل التطبيق');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      title="تحميل التطبيق"
    >
      <Download size={16} />
      <span>تحميل</span>
    </button>
  );
}
