import { useEffect, useState } from "react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  symbol: string;
  interval?: "1h" | "4h" | "1d";
}

export function CandlestickChart({ symbol, interval = "1h" }: CandlestickChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandles = async () => {
      try {
        setLoading(true);
        // محاكاة بيانات الشموع - في الإنتاج ستأتي من API حقيقي
        const mockCandles: Candle[] = Array.from({ length: 50 }, (_, i) => {
          const basePrice = 67000;
          const volatility = Math.sin(i * 0.5) * 500;
          const randomWalk = Math.random() * 1000 - 500;
          const price = basePrice + volatility + randomWalk;
          
          return {
            time: Date.now() - (50 - i) * 3600000,
            open: price - Math.random() * 200,
            high: price + Math.random() * 300,
            low: price - Math.random() * 300,
            close: price + Math.random() * 200,
          };
        });
        setCandles(mockCandles);
      } catch (error) {
        console.error("Failed to fetch candles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandles();
    const updateInterval = setInterval(fetchCandles, 60000); // تحديث كل دقيقة
    return () => clearInterval(updateInterval);
  }, [symbol, interval]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">جاري تحميل الشموع...</div>
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">لا توجد بيانات متاحة</div>
      </div>
    );
  }

  // حساب الحد الأدنى والأقصى للأسعار
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // أبعاد الرسم البياني
  const width = 800;
  const height = 400;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const candleWidth = chartWidth / candles.length * 0.8;
  const candleSpacing = chartWidth / candles.length;

  return (
    <div className="w-full bg-gray-900 rounded-lg p-4 overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {/* خطوط الشبكة الأفقية */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = padding + (chartHeight / 4) * i;
          const price = maxPrice - (priceRange / 4) * i;
          return (
            <g key={`grid-${i}`}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#333" strokeWidth="1" />
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
                ${price.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* الشموع */}
        {candles.map((candle, index) => {
          const x = padding + index * candleSpacing + candleSpacing / 2;
          
          // تحويل الأسعار إلى إحداثيات Y
          const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
          const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;
          const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
          const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;

          const isGreen = candle.close >= candle.open;
          const color = isGreen ? "#10b981" : "#ef4444";
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.abs(closeY - openY) || 1;

          return (
            <g key={`candle-${index}`}>
              {/* الخط العلوي والسفلي (الفتيل) */}
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
              
              {/* جسم الشمعة */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                opacity="0.8"
              />
            </g>
          );
        })}

        {/* المحاور */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2" />
      </svg>

      {/* معلومات الفترة الزمنية */}
      <div className="mt-4 text-center text-sm text-gray-400">
        <p>آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
    </div>
  );
}
