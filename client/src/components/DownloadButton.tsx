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
      className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
      title="تحميل التطبيق"
    >
      <Download size={18} />
    </button>
  );
}
