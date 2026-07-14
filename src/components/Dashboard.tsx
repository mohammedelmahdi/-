import { useMemo } from 'react';
import { Product, Sale, formatCurrency } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight, 
  ShoppingCart,
  Calendar
} from 'lucide-react';

// Helper to get YYYY-MM-DD format in the user's local timezone
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  onNavigateToStock: () => void;
  onNavigateToSales: () => void;
  onViewReceipt: (sale: Sale) => void;
}

export default function Dashboard({ 
  products, 
  sales, 
  onNavigateToStock, 
  onNavigateToSales,
  onViewReceipt 
}: DashboardProps) {

  // 1. Calculate Key Metrics
  const metrics = useMemo(() => {
    // Total stock valuation based on buying prices
    const totalStockValue = products.reduce((acc, p) => acc + (p.buyingPrice * p.quantity), 0);
    const totalPotentialRevenue = products.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
    
    // Today's date string matching (YYYY-MM-DD)
    const todayStr = getLocalDateString(new Date());
    
    // Today's sales
    const todaySales = sales.filter(s => {
      const saleDate = new Date(s.date);
      return getLocalDateString(saleDate) === todayStr;
    });
    const totalSalesToday = todaySales.reduce((acc, s) => acc + s.totalPrice, 0);

    // Total actual profit (Revenue - Buying Cost) from sales history
    const totalProfit = sales.reduce((acc, s) => {
      if (s.items && s.items.length > 0) {
        const cost = s.items.reduce((sum, item) => {
          if (item.sellType === 'carton') {
            // For carton sales: cartonsQuantity is the actual carton count.
            // item.buyingPriceAtSale is the carton buying price.
            const cartonsQty = item.cartonsQuantity || 0;
            return sum + (cartonsQty * item.buyingPriceAtSale);
          } else {
            // For single pairs: pairsQuantity is the pair count, fallback to item.quantity.
            // item.buyingPriceAtSale is the single pair buying price.
            const pairsQty = item.pairsQuantity || item.quantity;
            return sum + (pairsQty * item.buyingPriceAtSale);
          }
        }, 0);
        return acc + (s.totalPrice - cost);
      } else {
        const cost = s.buyingPriceAtSale * s.quantity;
        return acc + (s.totalPrice - cost);
      }
    }, 0);

    // Low stock items (quantity < 5, but > 0)
    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity < 5).length;
    // Out of stock items (quantity === 0)
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    return {
      totalStockValue,
      totalPotentialRevenue,
      totalSalesToday,
      todaySalesCount: todaySales.length,
      totalProfit,
      lowStockCount,
      outOfStockCount,
    };
  }, [products, sales]);

  // 2. Generate 7-day Sales Trend Data
  const weeklyTrend = useMemo(() => {
    const days = [];
    const locale = 'ar-DZ';
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      const label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
      
      const daySales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return getLocalDateString(saleDate) === dateStr;
      });
      const amount = daySales.reduce((acc, s) => acc + s.totalPrice, 0);
      const volume = daySales.reduce((acc, s) => {
        if (s.items && s.items.length > 0) {
          return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
        }
        return acc + s.quantity;
      }, 0);
      
      days.push({
        dateStr,
        label,
        amount,
        volume
      });
    }

    const maxAmount = Math.max(...days.map(d => d.amount), 100); // Avoid divide by 0

    return {
      days,
      maxAmount
    };
  }, [sales]);

  // 3. Recent Sales Activity Feed (Last 5 sales)
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div id="dashboard-section" className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">مرحباً، محمد</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">إليك الحالة العامة والنشاط اليومي لمتجرك.</p>
        </div>
        <div className="grid grid-cols-2 md:flex gap-2.5 w-full md:w-auto">
          <button 
            id="btn-quick-new-sale"
            onClick={onNavigateToSales}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-200 shadow-lg shadow-emerald-900/20 text-xs sm:text-sm h-11 sm:h-12 cursor-pointer w-full"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>بيع جديد</span>
          </button>
          <button 
            id="btn-quick-add-product"
            onClick={onNavigateToStock}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition duration-200 text-xs sm:text-sm h-11 sm:h-12 cursor-pointer w-full"
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>إدارة المخزون</span>
          </button>
        </div>
      </div>

      {/* Key Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric Card: Valeur du Stock */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between min-h-[115px] sm:min-h-[140px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-sm font-semibold text-slate-400 truncate">قيمة المخزون</span>
            <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 rounded-lg sm:rounded-xl text-indigo-400 shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-100 block truncate">
              {formatCurrency(metrics.totalStockValue)}
            </span>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 truncate">
              <span className="shrink-0">المحتملة:</span>
              <span className="font-semibold text-indigo-400 truncate">
                {formatCurrency(metrics.totalPotentialRevenue)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metric Card: Ventes d'aujourd'hui */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between min-h-[115px] sm:min-h-[140px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-sm font-semibold text-slate-400 truncate">مبيعات اليوم</span>
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 rounded-lg sm:rounded-xl text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-100 block truncate">
              {formatCurrency(metrics.totalSalesToday)}
            </span>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate">{metrics.todaySalesCount} عمليات</span>
            </div>
          </div>
        </motion.div>

        {/* Metric Card: Bénéfice Net Réalisé */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between min-h-[115px] sm:min-h-[140px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-sm font-semibold text-slate-400 truncate">إجمالي الأرباح</span>
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 rounded-lg sm:rounded-xl text-emerald-400 font-bold shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className={`text-base sm:text-xl md:text-2xl font-extrabold block truncate ${metrics.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(metrics.totalProfit)}
            </span>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">هوامش مبيعات متراكمة</p>
          </div>
        </motion.div>

        {/* Metric Card: Alertes de Stock */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToStock}
          className="bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between cursor-pointer group min-h-[115px] sm:min-h-[140px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-sm font-semibold text-slate-400 group-hover:text-indigo-400 transition-colors truncate">تنبيهات المخزون</span>
            <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${metrics.outOfStockCount > 0 ? 'bg-rose-500/10 text-rose-400' : metrics.lowStockCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-100">{metrics.lowStockCount + metrics.outOfStockCount}</span>
              <span className="text-[10px] sm:text-xs text-slate-400 truncate">سلع حرجة</span>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-1 flex gap-1.5 truncate">
              {metrics.outOfStockCount > 0 && <span className="text-rose-400 font-medium shrink-0">{metrics.outOfStockCount} نافذ</span>}
              {metrics.lowStockCount > 0 && <span className="text-amber-400 font-medium shrink-0">{metrics.lowStockCount} منخفض</span>}
              {metrics.lowStockCount + metrics.outOfStockCount === 0 && <span className="text-emerald-400 font-medium shrink-0">ممتاز ✓</span>}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Charts & Weekly Trends (8 columns on large screen) */}
        <div className="lg:col-span-8 bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-100">منحنى المبيعات الأسبوعي</h3>
              <p className="text-xs text-slate-400">مبيعات آخر 7 أيام</p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              السجل الحديث
            </span>
          </div>

          {/* Interactive CSS Bar Chart */}
          <div className="pt-4 overflow-x-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800 pb-1">
            <div className="flex items-end justify-between h-48 sm:h-56 min-w-[420px] sm:min-w-0 gap-1.5 sm:gap-4 border-b border-slate-800 pb-2">
              {weeklyTrend.days.map((day, idx) => {
                const percentage = (day.amount / weeklyTrend.maxAmount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none transition-all duration-200">
                      <div className="bg-slate-950 text-slate-100 text-[11px] font-bold rounded-lg px-2.5 py-1.5 shadow-xl border border-slate-800 whitespace-nowrap">
                        <p className="text-emerald-400">{formatCurrency(day.amount)}</p>
                        <p className="text-slate-400 text-[9px] font-normal text-center">{day.volume} وحدة مباعة</p>
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-950 border-l border-b border-slate-800 rotate-45 -mt-1"></div>
                    </div>

                    {/* Chart Column Pillar */}
                    <div className="w-full max-w-[40px] bg-slate-800/50 rounded-t-lg h-full flex items-end overflow-hidden">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${percentage}%` }}
                        transition={{ delay: idx * 0.05, duration: 0.6, ease: 'easeOut' }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          day.amount > 0 
                            ? 'bg-gradient-to-t from-indigo-600 to-emerald-400 group-hover:from-indigo-500 group-hover:to-emerald-300' 
                            : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* Day label */}
                    <span className="text-[10px] sm:text-xs text-slate-400 mt-2 font-medium capitalize truncate w-full text-center">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend info */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 mt-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-gradient-to-tr from-indigo-600 to-emerald-400"></span>
                  المبيعات (د.ج)
                </span>
              </div>
              <span>اضغط أو مرر لمشاهدة التفاصيل</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions Feed (4 columns on large screen) */}
        <div className="lg:col-span-4 bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">أحدث العمليات</h3>
              <button 
                id="btn-navigate-sales-all"
                onClick={onNavigateToSales}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 group cursor-pointer"
              >
                عرض الكل
                <ChevronRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* List of Recent Sales */}
            <div className="divide-y divide-slate-800 max-h-[290px] overflow-y-auto pr-1">
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="p-3 bg-slate-800 text-slate-500 rounded-full mb-3">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">لا توجد مبيعات مسجلة</p>
                  <p className="text-xs text-slate-500 mt-1">سجل أول عملية بيع لتبدأ.</p>
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.id} className="py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 font-bold">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{sale.productName}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(sale.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })} • {sale.quantity} وحدة
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-slate-100">
                        {formatCurrency(sale.totalPrice)}
                      </span>
                      <button 
                        onClick={() => onViewReceipt(sale)}
                        className="text-[10px] font-medium text-indigo-400 hover:underline opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      >
                        الوصل
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="bg-slate-950 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400 border border-slate-800/80">
              <span>المنتجات المسجلة: <strong className="text-slate-200">{products.length}</strong></span>
              <span>المبيعات المتراكمة: <strong className="text-slate-200">{sales.length}</strong></span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

