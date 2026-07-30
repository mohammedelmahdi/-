import { useState, useMemo } from 'react';
import { Product, Sale, Expense, PackagingPayment, formatCurrency, SaleStatus } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Package, 
  ShoppingCart, 
  ChevronDown, 
  Filter, 
  X, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  RotateCcw,
  Users,
  Award,
  BarChart3,
  Percent,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

// Helper to get YYYY-MM-DD format in local timezone
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface StatsManagerProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  packagingPayments?: PackagingPayment[];
  packagingPrice: number;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'all';

export default function StatsManager({
  products,
  sales,
  expenses,
  packagingPrice
}: StatsManagerProps) {
  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  
  // Interactive UI States
  const [hoveredChartBar, setHoveredChartBar] = useState<any | null>(null);

  // Extract all unique Wilayas from sales for the dropdown filter
  const allWilayas = useMemo(() => {
    const list = new Set<string>();
    sales.forEach(s => {
      if (s.customerState?.trim()) {
        list.add(s.customerState.trim());
      }
    });
    return Array.from(list).sort();
  }, [sales]);

  // Determine active date range based on preset or custom input
  const activeDateRange = useMemo(() => {
    const today = new Date();
    let start = '';
    let end = getLocalDateString(today);

    switch (datePreset) {
      case 'today':
        start = getLocalDateString(today);
        break;
      case 'yesterday': {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        start = getLocalDateString(yesterday);
        end = getLocalDateString(yesterday);
        break;
      }
      case 'last7': {
        const prev7 = new Date();
        prev7.setDate(today.getDate() - 6); // Includes today
        start = getLocalDateString(prev7);
        break;
      }
      case 'last30': {
        const prev30 = new Date();
        prev30.setDate(today.getDate() - 29);
        start = getLocalDateString(prev30);
        break;
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = getLocalDateString(firstDay);
        break;
      }
      case 'lastMonth': {
        const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        start = getLocalDateString(firstDayPrevMonth);
        end = getLocalDateString(lastDayPrevMonth);
        break;
      }
      case 'all':
      default:
        start = '';
        end = '';
        break;
    }

    // Override with custom dates if custom is actively filled (preset isn't what defines it)
    if (startDate) start = startDate;
    if (endDate) end = endDate;

    return { start, end };
  }, [datePreset, startDate, endDate]);

  // Filter Sales list based on all selected criteria
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDateStr = sale.date.split('T')[0];
      const { start, end } = activeDateRange;

      // 1. Date filter
      if (start && saleDateStr < start) return false;
      if (end && saleDateStr > end) return false;

      // 2. Status filter
      if (statusFilter !== 'all') {
        const saleStatus = sale.status || 'pending';
        if (saleStatus !== statusFilter) return false;
      }

      // 3. Product filter
      if (productFilter !== 'all') {
        if (sale.items && sale.items.length > 0) {
          const hasProduct = sale.items.some(item => item.productId === productFilter);
          if (!hasProduct) return false;
        } else {
          if (sale.productId !== productFilter) return false;
        }
      }

      // 4. Wilaya/State filter
      if (wilayaFilter !== 'all') {
        if (sale.customerState?.trim() !== wilayaFilter) return false;
      }

      return true;
    });
  }, [sales, activeDateRange, statusFilter, productFilter, wilayaFilter]);

  // Filter Expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = exp.date;
      const { start, end } = activeDateRange;

      if (start && expDate < start) return false;
      if (end && expDate > end) return false;
      return true;
    });
  }, [expenses, activeDateRange]);

  // Calculate detailed financial metrics
  const financialMetrics = useMemo(() => {
    let totalSalesVolume = 0; // total pairs sold
    let totalGrossRevenue = 0; // total money in
    let totalBuyingCost = 0; // total buying cost of sold items
    
    let deliveredRevenue = 0;
    let deliveredBuyingCost = 0;
    
    let pendingRevenue = 0;
    let pendingBuyingCost = 0;
    
    let shippedRevenue = 0; // المال في الطريق
    let shippedBuyingCost = 0;
    
    let returnedCount = 0;
    let returnedRevenue = 0;
    let returnedBuyingCost = 0;
    
    let totalColisCount = 0;

    filteredSales.forEach(sale => {
      const status = sale.status || 'pending';
      totalColisCount += (sale.customerColis || 1);

      // Extract quantities and costs
      let saleQty = sale.quantity;
      let buyingCost = 0;

      if (sale.items && sale.items.length > 0) {
        buyingCost = sale.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          const singleBuying = product?.singlePairBuyingPrice || product?.buyingPrice || item.buyingPriceAtSale;
          const pairsPerCtn = product?.pairsPerCarton || 12;
          const cartonBuying = product?.buyingPricePerCarton || (singleBuying * pairsPerCtn);
          
          if (item.sellType === 'carton') {
            return sum + (item.cartonsQuantity * cartonBuying);
          } else {
            return sum + (item.pairsQuantity * singleBuying);
          }
        }, 0);
      } else {
        buyingCost = sale.buyingPriceAtSale * sale.quantity;
      }

      totalSalesVolume += saleQty;
      totalGrossRevenue += sale.totalPrice;
      totalBuyingCost += buyingCost;

      if (status === 'delivered') {
        deliveredRevenue += sale.totalPrice;
        deliveredBuyingCost += buyingCost;
      } else if (status === 'pending') {
        pendingRevenue += sale.totalPrice;
        pendingBuyingCost += buyingCost;
      } else if (status === 'shipped') {
        shippedRevenue += sale.totalPrice;
        shippedBuyingCost += buyingCost;
      } else if (status === 'returned') {
        returnedCount++;
        returnedRevenue += sale.totalPrice;
        returnedBuyingCost += buyingCost;
      }
    });

    // Operational expenses in the selected period
    const totalExpensesAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Packaging cost based on filtered sales' parcels
    const totalPackagingCost = totalColisCount * packagingPrice;

    // Gross profits
    const totalPotentialProfit = totalGrossRevenue - totalBuyingCost; // Profit if all are delivered
    const actualDeliveredProfit = deliveredRevenue - deliveredBuyingCost; // Realized product profit

    // Net cash flow and actual net profit
    // Net profit = actual delivered profit - operational expenses - total packaging costs of all parcels
    const netProfit = actualDeliveredProfit - totalExpensesAmount - totalPackagingCost;

    // Delivery Success Rate
    const totalFinishedSales = filteredSales.filter(s => s.status === 'delivered' || s.status === 'returned').length;
    const deliveryRate = totalFinishedSales > 0 
      ? Math.round((filteredSales.filter(s => s.status === 'delivered').length / totalFinishedSales) * 100) 
      : 0;

    return {
      totalSalesVolume,
      totalGrossRevenue,
      totalBuyingCost,
      deliveredRevenue,
      deliveredBuyingCost,
      pendingRevenue,
      shippedRevenue,
      returnedCount,
      returnedRevenue,
      returnedBuyingCost,
      totalExpensesAmount,
      totalPackagingCost,
      totalPotentialProfit,
      actualDeliveredProfit,
      netProfit,
      deliveryRate,
      totalColisCount,
      totalSalesCount: filteredSales.length
    };
  }, [filteredSales, filteredExpenses, products, packagingPrice]);

  // Top Selling Products breakdown
  const topProducts = useMemo(() => {
    const productStatsMap = new Map<string, {
      name: string;
      sku: string;
      category: string;
      cartonsCount: number;
      pairsCount: number;
      revenue: number;
      profit: number;
    }>();

    filteredSales.forEach(sale => {
      const isDelivered = (sale.status === 'delivered');
      
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const prodId = item.productId;
          const stat = productStatsMap.get(prodId) || {
            name: item.productName,
            sku: item.sku || 'N/A',
            category: products.find(p => p.id === prodId)?.category || 'أخرى',
            cartonsCount: 0,
            pairsCount: 0,
            revenue: 0,
            profit: 0
          };

          if (item.sellType === 'carton') {
            stat.cartonsCount += item.cartonsQuantity;
          } else {
            stat.pairsCount += item.pairsQuantity;
          }

          stat.revenue += item.totalPrice;
          
          // Cost calculation
          const product = products.find(p => p.id === item.productId);
          const singleBuying = product?.singlePairBuyingPrice || product?.buyingPrice || item.buyingPriceAtSale;
          const pairsPerCtn = product?.pairsPerCarton || 12;
          const cartonBuying = product?.buyingPricePerCarton || (singleBuying * pairsPerCtn);
          const cost = item.sellType === 'carton' ? (item.cartonsQuantity * cartonBuying) : (item.pairsQuantity * singleBuying);
          
          stat.profit += (item.totalPrice - cost);
          productStatsMap.set(prodId, stat);
        });
      } else {
        // Fallback for flat structure sale
        const prodId = sale.productId;
        const stat = productStatsMap.get(prodId) || {
          name: sale.productName,
          sku: 'N/A',
          category: products.find(p => p.id === prodId)?.category || 'أخرى',
          cartonsCount: 0,
          pairsCount: 0,
          revenue: 0,
          profit: 0
        };

        stat.pairsCount += sale.quantity;
        stat.revenue += sale.totalPrice;
        const cost = sale.buyingPriceAtSale * sale.quantity;
        stat.profit += (sale.totalPrice - cost);
        productStatsMap.set(prodId, stat);
      }
    });

    return Array.from(productStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales, products]);

  // Breakdown of Sales and delivery performance by Wilaya (State)
  const wilayaStats = useMemo(() => {
    const statsMap = new Map<string, {
      wilaya: string;
      totalSales: number;
      revenue: number;
      colis: number;
      delivered: number;
      returned: number;
      pending: number;
    }>();

    filteredSales.forEach(sale => {
      const state = sale.customerState?.trim() || 'غير محدد';
      const status = sale.status || 'pending';
      const col = sale.customerColis || 1;

      const stat = statsMap.get(state) || {
        wilaya: state,
        totalSales: 0,
        revenue: 0,
        colis: 0,
        delivered: 0,
        returned: 0,
        pending: 0
      };

      stat.totalSales += 1;
      stat.revenue += sale.totalPrice;
      stat.colis += col;

      if (status === 'delivered') {
        stat.delivered += 1;
      } else if (status === 'returned') {
        stat.returned += 1;
      } else {
        stat.pending += 1;
      }

      statsMap.set(state, stat);
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredSales]);

  // Daily Sales trend chart calculator (tracks revenue & profits daily over range)
  const chartDailyTrend = useMemo(() => {
    const dailyMap = new Map<string, {
      dateLabel: string;
      revenue: number;
      profit: number;
      salesCount: number;
    }>();

    // Fill daily keys depending on the filtered sales dates to ensure sorting
    filteredSales.forEach(sale => {
      const dayStr = sale.date.split('T')[0]; // YYYY-MM-DD
      const stat = dailyMap.get(dayStr) || {
        dateLabel: dayStr,
        revenue: 0,
        profit: 0,
        salesCount: 0
      };

      stat.revenue += sale.totalPrice;
      stat.salesCount += 1;

      // Profit calculation
      let buyingCost = 0;
      if (sale.items && sale.items.length > 0) {
        buyingCost = sale.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          const singleBuying = product?.singlePairBuyingPrice || product?.buyingPrice || item.buyingPriceAtSale;
          const pairsPerCtn = product?.pairsPerCarton || 12;
          const cartonBuying = product?.buyingPricePerCarton || (singleBuying * pairsPerCtn);
          
          if (item.sellType === 'carton') {
            return sum + (item.cartonsQuantity * cartonBuying);
          } else {
            return sum + (item.pairsQuantity * singleBuying);
          }
        }, 0);
      } else {
        buyingCost = sale.buyingPriceAtSale * sale.quantity;
      }

      // We only count product profit if it's delivered, or potential profit? 
      // Let's track potential daily profit to show general business performance.
      stat.profit += (sale.totalPrice - buyingCost);
      dailyMap.set(dayStr, stat);
    });

    // Sort days chronologically
    const sortedDays = Array.from(dailyMap.values())
      .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));

    // For better visual, if it's empty, mock one day or leave empty
    return sortedDays;
  }, [filteredSales, products]);

  // Clear all filters
  const resetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setProductFilter('all');
    setWilayaFilter('all');
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 1. Header with Reset Filters Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>مركز الإحصائيات والتحليل المالي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">تتبع التدفقات المالية للمبيعات، الأرباح، المصاريف، ونسب التوصيل لمتجرك بدقة.</p>
        </div>
        
        {/* Quick Reset Button if filters are active */}
        {(datePreset !== 'all' || statusFilter !== 'all' || productFilter !== 'all' || wilayaFilter !== 'all' || startDate || endDate) && (
          <button 
            onClick={resetFilters}
            className="self-start md:self-auto flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إعادة تعيين الفلاتر</span>
          </button>
        )}
      </div>

      {/* 2. Interactive Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 pb-2 border-b border-slate-800">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-extrabold uppercase tracking-wider">تصفية وفلترة البيانات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Preset Date Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1.5">الفترة الزمنية</label>
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value as DatePreset);
                  // Reset custom dates if switching presets
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 cursor-pointer appearance-none text-right"
              >
                <option value="all">كل الأوقات</option>
                <option value="today">اليوم</option>
                <option value="yesterday">البارحة</option>
                <option value="last7">آخر 7 أيام</option>
                <option value="last30">آخر 30 يوم</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="lastMonth">الشهر الماضي</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1.5">حالة الطلبية / المبيعة</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 cursor-pointer appearance-none text-right"
              >
                <option value="all">كل الحالات</option>
                <option value="delivered">تم التوصيل ✅</option>
                <option value="pending">قيد الانتظار ⏳</option>
                <option value="shipped">قيد الشحن 🚚</option>
                <option value="returned">مسترجع ❌</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Wilaya Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1.5">الولاية (موقع الزبون)</label>
            <div className="relative">
              <select
                value={wilayaFilter}
                onChange={(e) => setWilayaFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 cursor-pointer appearance-none text-right"
              >
                <option value="all">كل الولايات ({allWilayas.length})</option>
                {allWilayas.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1.5">تصفية حسب موديل المنتج</label>
            <div className="relative">
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 cursor-pointer appearance-none text-right"
              >
                <option value="all">جميع الموديلات ({products.length})</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Custom Start/End Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">من تاريخ (بداية الفترة المخصصة)</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('all'); // custom overrides preset
                }}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 text-right font-mono"
              />
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">إلى تاريخ (نهاية الفترة المخصصة)</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('all'); // custom overrides preset
                }}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 outline-hidden h-10 text-right font-mono"
              />
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Key Financials Bento Grid (صناديق المال والأرباح) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Gross Sales (الرقم الإجمالي) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl min-h-[130px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي المبيعات (الكل)</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-100 block">
              {formatCurrency(financialMetrics.totalGrossRevenue)}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block font-bold">
              مجموع مبيعات {financialMetrics.totalSalesCount} طلبيات مباعة
            </span>
          </div>
        </div>

        {/* Metric 2: Delivered Cash vs Shipped (المال المحصل وتحت التوصيل) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl min-h-[130px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">السيولة المستلمة والجارية</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-bold">المستلمة (توصيل):</span>
              <span className="text-xs font-extrabold text-emerald-400">
                {formatCurrency(financialMetrics.deliveredRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400 font-bold">في الطريق (شحن):</span>
              <span className="text-xs font-extrabold text-indigo-400">
                {formatCurrency(financialMetrics.shippedRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[9px] text-amber-500 font-bold">المعلقة:</span>
              <span className="text-xs font-extrabold text-amber-500">
                {formatCurrency(financialMetrics.pendingRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Costs & Expenses (المصاريف والتغليف والسلع) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl min-h-[130px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">التكاليف والمصاريف</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400 font-bold">شراء البضاعة:</span>
              <span className="text-xs font-extrabold text-rose-300">
                {formatCurrency(financialMetrics.totalBuyingCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400 font-bold">المصاريف العامة:</span>
              <span className="text-xs font-extrabold text-rose-300">
                {formatCurrency(financialMetrics.totalExpensesAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[9px] text-slate-400 font-bold">تكلفة التغليف ({financialMetrics.totalColisCount} طرد):</span>
              <span className="text-xs font-extrabold text-slate-300">
                {formatCurrency(financialMetrics.totalPackagingCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Net Real Pocket Profit (الأرباح الصافية الحقيقية) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/20 flex flex-col justify-between shadow-xl min-h-[130px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-300">صافي الأرباح الحقيقية 💰</span>
            <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400 block tracking-tight">
              {formatCurrency(financialMetrics.netProfit)}
            </span>
            <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
              أرباح السلع الموصلة مطروحاً منها التغليف والمصاريف العامة.
            </p>
          </div>
        </div>

      </div>

      {/* 4. Second Stats row (Returned losses and Delivery Rates) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Delivery Success Rate */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">معدل نجاح التوصيل</span>
              <span className="text-lg font-black text-emerald-400">{financialMetrics.deliveryRate}%</span>
            </div>
          </div>
          <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
            {/* simple circular progress indicator using svg */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="32" cy="32" r="26" stroke="#10b981" strokeWidth="6" fill="transparent" 
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 * (1 - financialMetrics.deliveryRate / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-100">{financialMetrics.deliveryRate}%</span>
          </div>
        </div>

        {/* Money Pending in Shipped */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Truck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">أموال في الطريق (مباعة تشحن حالياً)</span>
            <span className="text-lg font-black text-amber-400">
              {formatCurrency(financialMetrics.shippedRevenue)}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">سيولة مؤجلة لحين تأكيد التوصيل</span>
          </div>
        </div>

        {/* Returns & associated capital locked or lost */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">الطلبيات المسترجعة والخسائر</span>
            <span className="text-lg font-black text-rose-400">
              {financialMetrics.returnedCount} طلبيات مسترجعة
            </span>
            <span className="text-[9px] text-rose-300 block mt-0.5">
              رأس مال بضائع مجمد: {formatCurrency(financialMetrics.returnedBuyingCost)}
            </span>
          </div>
        </div>

      </div>

      {/* 5. Custom High-Fidelity SVG Interactive Chart (الرسم البياني للمبيعات والأرباح اليومية) */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-100">النمو اليومي وحركة الأرباح والمبيعات</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">يوضح حركة إجمالي المبيعات مقابل هوامش الربح اليومية خلال الفترة المحددة.</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs"></span>
              المبيعات الإجمالية
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
              هامش الأرباح التقديري
            </span>
          </div>
        </div>

        {chartDailyTrend.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">لا توجد بيانات مبيعات لعرض الرسم البياني.</p>
            <p className="text-[10px] text-slate-500">جرب توسيع الفترة الزمنية أو إزالة فلاتر التصفية النشطة.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Custom Interactive SVG Graph */}
            <div className="h-64 w-full bg-slate-950/30 rounded-xl p-4 flex items-end relative overflow-hidden">
              
              {/* Chart Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                <div className="w-full border-t border-slate-800/40"></div>
                <div className="w-full border-t border-slate-800/40"></div>
                <div className="w-full border-t border-slate-800/40"></div>
                <div className="w-full border-t border-slate-800/40"></div>
                <div className="w-full border-t border-slate-800/40"></div>
              </div>

              {/* Chart Bars */}
              <div className="w-full h-full flex items-end justify-around gap-2 z-10 pt-6 pb-2">
                {chartDailyTrend.map((day, index) => {
                  // Calculate heights based on maximum amount
                  const maxAmt = Math.max(...chartDailyTrend.map(d => d.revenue), 100);
                  const revHeight = (day.revenue / maxAmt) * 85; // Max 85% height
                  const profitHeight = (day.profit / maxAmt) * 85;

                  const isHovered = hoveredChartBar && hoveredChartBar.dateLabel === day.dateLabel;

                  return (
                    <div 
                      key={day.dateLabel}
                      className="flex-1 flex flex-col items-center relative group cursor-pointer"
                      onMouseEnter={() => setHoveredChartBar(day)}
                      onMouseLeave={() => setHoveredChartBar(null)}
                    >
                      {/* Bars overlay/container */}
                      <div className="w-full max-w-[40px] h-[180px] flex items-end justify-center gap-1 relative">
                        
                        {/* Revenue Bar (Indigo) */}
                        <div 
                          className={`w-3 sm:w-4 rounded-t-xs transition-all duration-300 ${
                            isHovered ? 'bg-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-indigo-600/80'
                          }`}
                          style={{ height: `${revHeight}%` }}
                        ></div>

                        {/* Profit Bar (Emerald) */}
                        <div 
                          className={`w-3 sm:w-4 rounded-t-xs transition-all duration-300 ${
                            isHovered ? 'bg-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/80'
                          }`}
                          style={{ height: `${profitHeight}%` }}
                        ></div>

                      </div>

                      {/* X-Axis Date label */}
                      <span className="text-[9px] text-slate-500 mt-2 font-mono truncate max-w-[60px] text-center block">
                        {day.dateLabel.substring(5)} {/* MM-DD */}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hover Tooltip Overlay */}
              {hoveredChartBar && (
                <div 
                  className="absolute z-20 bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-right text-xs space-y-1.5 transition-all duration-200"
                  style={{
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    minWidth: '180px'
                  }}
                >
                  <p className="font-bold text-slate-300 text-[10px] border-b border-slate-800 pb-1 flex justify-between">
                    <span>التاريخ:</span>
                    <span className="font-mono">{hoveredChartBar.dateLabel}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-slate-400">إجمالي المبيعات:</span>
                    <span className="font-black text-indigo-400">{formatCurrency(hoveredChartBar.revenue)}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-slate-400">الأرباح التقديرية:</span>
                    <span className="font-black text-emerald-400">{formatCurrency(hoveredChartBar.profit)}</span>
                  </p>
                  <p className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>عدد المبيعات:</span>
                    <span>{hoveredChartBar.salesCount} مبيعات</span>
                  </p>
                </div>
              )}

            </div>
            
            <p className="text-[10px] text-center text-slate-500 mt-2 font-bold">💡 مرر مؤشر الماوس فوق الأعمدة البيانية لعرض التفاصيل اليومية لكل يوم.</p>
          </div>
        )}
      </div>

      {/* 6. Insights Grid: Top Selling Products and Top States/Wilayas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Module A: Top Selling Products (المنتجات الأكثر مبيعاً) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>الموديلات والسلع الأكثر مبيعاً ورواجاً</span>
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg">الأعلى دخلاً</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              لا توجد مبيعات مسجلة في هذه الفترة لإظهار إحصائيات المنتجات.
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div 
                  key={p.name + idx}
                  className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between gap-4 text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Number Badge */}
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {p.sku} | {p.category}</p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-[10px] text-slate-500 font-bold">
                      {p.cartonsCount > 0 ? `${p.cartonsCount} كرتون` : ''} 
                      {p.cartonsCount > 0 && p.pairsCount > 0 ? ' و ' : ''}
                      {p.pairsCount > 0 ? `${p.pairsCount} زوج` : ''}
                      {p.cartonsCount === 0 && p.pairsCount === 0 ? '0 مبيعات' : ''}
                    </p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Module B: Top Performing States (الولايات الأكثر شراءً ونسبة نجاحها) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              <span>المبيعات والشحن حسب الولايات الجزائرية</span>
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg">توزيع جغرافي</span>
          </div>

          {wilayaStats.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              لا توجد مبيعات محددة بولاية زبون لعرض التوزيع الجغرافي.
            </div>
          ) : (
            <div className="space-y-3">
              {wilayaStats.map((w, idx) => {
                const totalFinished = w.delivered + w.returned;
                const deliverySuccessRate = totalFinished > 0 
                  ? Math.round((w.delivered / totalFinished) * 100) 
                  : 100; // default to 100 if none finished

                return (
                  <div 
                    key={w.wilaya}
                    className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-black text-slate-200">{w.wilaya}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span>{w.totalSales} طلبيات</span>
                          <span>•</span>
                          <span>{w.colis} طرود (كوليات)</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Rate for the state */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0 shrink-0">
                      <div className="text-right sm:text-left">
                        <span className="text-[10px] text-slate-500 block">إجمالي المداخيل</span>
                        <span className="text-xs font-extrabold text-slate-200">{formatCurrency(w.revenue)}</span>
                      </div>
                      
                      <div className="text-left shrink-0">
                        <span className="text-[9px] text-slate-400 block">التوصيل</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm ${
                          deliverySuccessRate >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                          deliverySuccessRate >= 50 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {deliverySuccessRate}% نجاح
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
