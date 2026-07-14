/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Product, Sale, ViewType } from './types';
import Splash from './components/Splash';
import Dashboard from './components/Dashboard';
import StockManager from './components/StockManager';
import SalesManager from './components/SalesManager';
import ReceiptModal from './components/ReceiptModal';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Boxes, 
  Sparkles,
  FileSpreadsheet,
  Cloud,
  Database,
  LogOut,
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  createDatabaseSpreadsheet, 
  syncProductsToSheet, 
  syncSalesToSheet 
} from './lib/googleSheets';

const LOCAL_STORAGE_PRODUCTS_KEY = 'gestock_inventory_products_dz_v2';
const LOCAL_STORAGE_SALES_KEY = 'gestock_inventory_sales_dz_v2';

// Initial sample inventory in Arabic with Algerian Dinar (DZD) scale
const SAMPLE_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'هاتف ذكي برو X1', sku: 'MOB-001', category: 'إلكترونيات', quantity: 12, buyingPrice: 45000, sellingPrice: 59900 },
  { id: 'prod-2', name: 'قهوة أرابيكا 1 كغ', sku: 'ALM-012', category: 'مواد غذائية', quantity: 25, buyingPrice: 1200, sellingPrice: 1850 },
  { id: 'prod-3', name: 'قميص قطن عضوي', sku: 'VET-085', category: 'ملابس', quantity: 4, buyingPrice: 1500, sellingPrice: 2900 },
  { id: 'prod-4', name: 'كريم مرطب 200 مل', sku: 'COS-003', category: 'مستحضرات تجميل', quantity: 0, buyingPrice: 1800, sellingPrice: 3200 },
  { id: 'prod-5', name: 'كرسي مكتب مريح', sku: 'MSN-402', category: 'منزل', quantity: 8, buyingPrice: 14000, sellingPrice: 22000 }
];


// Initial sample sales logs matching the last week
const generateSampleSales = (): Sale[] => {
  const salesList: Sale[] = [];
  const today = new Date();
  
  const salesSeedData = [
    { offsetDays: 6, hour: 9, qty: 1, prodIdx: 0 },   // 6 days ago
    { offsetDays: 5, hour: 14, qty: 3, prodIdx: 1 },  // 5 days ago
    { offsetDays: 4, hour: 11, qty: 1, prodIdx: 4 },  // 4 days ago
    { offsetDays: 3, hour: 16, qty: 1, prodIdx: 2 },  // 3 days ago
    { offsetDays: 2, hour: 10, qty: 2, prodIdx: 1 },  // 2 days ago
    { offsetDays: 1, hour: 15, qty: 1, prodIdx: 0 },  // Yesterday
    { offsetDays: 1, hour: 12, qty: 4, prodIdx: 1 },  // Yesterday
    { offsetDays: 0, hour: 8, qty: 2, prodIdx: 2 },   // Today
    { offsetDays: 0, hour: 11, qty: 1, prodIdx: 1 }    // Today
  ];

  salesSeedData.forEach((s, idx) => {
    const saleDate = new Date(today);
    saleDate.setDate(today.getDate() - s.offsetDays);
    saleDate.setHours(s.hour, 30, 0, 0);

    const prod = SAMPLE_PRODUCTS[s.prodIdx];
    salesList.push({
      id: `vnt-${2050 + idx}`,
      date: saleDate.toISOString(),
      productId: prod.id,
      productName: prod.name,
      quantity: s.qty,
      totalPrice: prod.sellingPrice * s.qty,
      buyingPriceAtSale: prod.buyingPrice,
      sellingPriceAtSale: prod.sellingPrice,
    });
  });

  return salesList;
};

export default function App() {
  const [isSplashShowing, setIsSplashShowing] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // Google Sheets database states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isMobileSyncOpen, setIsMobileSyncOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Initial State Load from localStorage and listen to Auth
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    
    // Load products
    const savedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    let currentProducts: Product[] = [];
    if (savedProducts) {
      currentProducts = JSON.parse(savedProducts);
      setProducts(currentProducts);
    } else {
      currentProducts = SAMPLE_PRODUCTS;
      setProducts(SAMPLE_PRODUCTS);
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(SAMPLE_PRODUCTS));
    }

    // Load sales
    const savedSales = localStorage.getItem(LOCAL_STORAGE_SALES_KEY);
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    } else {
      const initialSales = generateSampleSales();
      setSales(initialSales);
      localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(initialSales));
    }

    // Load saved Google Sheet ID
    const savedSheetId = localStorage.getItem('gestock_google_sheet_id');
    if (savedSheetId) {
      setSheetId(savedSheetId);
    }

    // Init Auth listener
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Synchronize products helper (Local + Cloud Sheets Sync)
  const syncProducts = async (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
    
    if (googleToken && sheetId) {
      try {
        await syncProductsToSheet(googleToken, sheetId, updatedProducts);
      } catch (err) {
        console.error('Auto product sync failed:', err);
      }
    }
  };

  // 3. Synchronize sales helper (Local + Cloud Sheets Sync)
  const syncSales = async (updatedSales: Sale[]) => {
    setSales(updatedSales);
    localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(updatedSales));
    
    if (googleToken && sheetId) {
      try {
        await syncSalesToSheet(googleToken, sheetId, updatedSales);
      } catch (err) {
        console.error('Auto sales sync failed:', err);
      }
    }
  };

  // Trigger manually complete database sync
  const handleForceSync = async (activeToken = googleToken, activeSheetId = sheetId) => {
    if (!activeToken || !activeSheetId) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      await syncProductsToSheet(activeToken, activeSheetId, products);
      await syncSalesToSheet(activeToken, activeSheetId, sales);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setAuthError(null);
        
        // Save user preference or sync with existing sheet
        const savedSheetId = localStorage.getItem('gestock_google_sheet_id');
        if (savedSheetId) {
          handleForceSync(result.accessToken, savedSheetId);
        }
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      const errMsg = err?.message || '';
      const errCode = err?.code || '';
      
      if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user')) {
        setAuthError('تنبيه: تم إغلاق النافذة قبل إتمام تسجيل الدخول. لحل المشكلة، يرجى فتح التطبيق في علامة تبويب جديدة ثم المحاولة مجدداً.');
      } else if (errCode === 'auth/cancelled-popup-request' || errMsg.includes('cancelled-popup-request')) {
        setAuthError('تنبيه: تم حظر النافذة أو إلغاء الطلب من المتصفح (Iframe). يرجى فتح التطبيق في علامة تبويب جديدة وتفعيل السماح بالنوافذ المنبثقة.');
      } else {
        setAuthError('حدث خطأ أثناء تسجيل الدخول: يرجى تجربة فتح التطبيق في علامة تبويب جديدة والتأكد من السماح بالنوافذ المنبثقة (Popups).');
      }
    }
  };

  const handleCreateSheetDb = async () => {
    if (!googleToken) return;
    setIsSyncing(true);
    try {
      const newSheetId = await createDatabaseSpreadsheet(googleToken);
      setSheetId(newSheetId);
      localStorage.setItem('gestock_google_sheet_id', newSheetId);
      await handleForceSync(googleToken, newSheetId);
    } catch (err) {
      console.error('Failed to create sheet database:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
  };

  // --- CRUD Inventory Event Handlers ---
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const freshProduct: Product = {
      ...newProd,
      id: `prod-${Math.floor(1000 + Math.random() * 9000)}`
    };
    const nextList = [...products, freshProduct];
    syncProducts(nextList);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const nextList = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    syncProducts(nextList);
  };

  const handleDeleteProduct = (productId: string) => {
    const nextList = products.filter(p => p.id !== productId);
    syncProducts(nextList);
  };

  // --- POS Sale Event Handler ---
  const handleAddSale = (newSale: Omit<Sale, 'id' | 'date'>) => {
    const freshSale: Sale = {
      ...newSale,
      id: `vnt-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString()
    };

    // Update sales logs
    const nextSales = [...sales, freshSale];
    syncSales(nextSales);

    // Decrement stock levels of the product(s) in real-time
    const nextProducts = products.map(p => {
      if (freshSale.items && freshSale.items.length > 0) {
        const cartItem = freshSale.items.find(item => item.productId === p.id);
        if (cartItem) {
          const nextQty = Math.max(0, p.quantity - cartItem.quantity);
          const pairsPerCtn = p.pairsPerCarton || 12;
          return {
            ...p,
            quantity: nextQty,
            cartonsCount: Math.max(0, Math.floor(nextQty / pairsPerCtn))
          };
        }
      } else if (p.id === freshSale.productId) {
        const nextQty = Math.max(0, p.quantity - freshSale.quantity);
        const pairsPerCtn = p.pairsPerCarton || 12;
        return {
          ...p,
          quantity: nextQty,
          cartonsCount: Math.max(0, Math.floor(nextQty / pairsPerCtn))
        };
      }
      return p;
    });
    syncProducts(nextProducts);
  };

  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    // Filter out the sale
    const nextSales = sales.filter(s => s.id !== saleId);
    syncSales(nextSales);

    // Increment stock levels back
    const nextProducts = products.map(p => {
      if (saleToDelete.items && saleToDelete.items.length > 0) {
        const cartItem = saleToDelete.items.find(item => item.productId === p.id);
        if (cartItem) {
          const nextQty = p.quantity + cartItem.quantity;
          const pairsPerCtn = p.pairsPerCarton || 12;
          return {
            ...p,
            quantity: nextQty,
            cartonsCount: Math.max(0, Math.floor(nextQty / pairsPerCtn))
          };
        }
      } else if (p.id === saleToDelete.productId) {
        const nextQty = p.quantity + saleToDelete.quantity;
        const pairsPerCtn = p.pairsPerCarton || 12;
        return {
          ...p,
          quantity: nextQty,
          cartonsCount: Math.max(0, Math.floor(nextQty / pairsPerCtn))
        };
      }
      return p;
    });
    syncProducts(nextProducts);
  };

  // Splash complete
  const handleSplashComplete = () => {
    setIsSplashShowing(false);
  };

  if (isSplashShowing) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      
      {/* 1. Sidebar - Fixed on desktop viewports */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col justify-between p-5 border-l border-slate-800 shrink-0 sticky top-0 h-screen">
        <div className="space-y-8">
          
          {/* Logo and App name */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">جيستوك</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">التجارة الاحترافية</p>
            </div>
          </div>

          {/* Desktop Navigation Link List */}
          <nav className="space-y-1.5">
            
            {/* Nav Link: Dashboard */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </button>

            {/* Nav Link: Stock */}
            <button
              onClick={() => setCurrentView('stock')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                currentView === 'stock'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              إدارة المخزون
            </button>

            {/* Nav Link: Sales */}
            <button
              onClick={() => setCurrentView('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                currentView === 'sales'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              الصندوق والمبيعات
            </button>

          </nav>
        </div>

        {/* Google Sheets Connection & Sync panel */}
        <div className="pt-4 border-t border-slate-800 space-y-3 px-2">
          {!googleUser ? (
            <div className="space-y-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                {/* Google colorful logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3s2.822-6.3 6.3-6.3c1.543 0 2.943.557 4.029 1.472l3.128-3.128C19.114 2.129 15.9.9 12.24.9 6.086.9.9 6.086.9 12.24s5.186 11.34 11.34 11.34c6.243 0 11.34-5.097 11.34-11.34 0-.771-.086-1.5-.214-2.186H12.24z"/>
                </svg>
                <span>ربط حساب Google</span>
              </button>
              
              {authError && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl space-y-2 text-right">
                  <p className="text-[10px] text-rose-300 leading-relaxed font-bold">{authError}</p>
                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>افتح التطبيق في علامة تبويب جديدة</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={googleUser.photoURL || ''} alt={googleUser.displayName || ''} className="w-7 h-7 rounded-full border border-indigo-500/50" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-100 truncate">{googleUser.displayName}</p>
                    <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      متصل بقوقل
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleGoogleLogout}
                  title="تسجيل الخروج"
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {!sheetId ? (
                <button
                  onClick={handleCreateSheetDb}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-3 py-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-md disabled:opacity-55"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>{isSyncing ? 'جاري الإنشاء...' : 'إنشاء قاعدة بيانات Sheets'}</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleForceSync()}
                      disabled={isSyncing}
                      className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer disabled:opacity-55"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'مزامنة...' : 'تزامن الآن'}</span>
                    </button>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-2 rounded-lg font-bold text-[10px] transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح الشيت</span>
                    </a>
                  </div>
                  {syncStatus === 'success' && (
                    <p className="text-[9px] text-center text-emerald-400 font-bold">تمت المزامنة بنجاح! ✅</p>
                  )}
                  {syncStatus === 'error' && (
                    <p className="text-[9px] text-center text-rose-400 font-bold">فشلت المزامنة. أعد المحاولة ❌</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </aside>

      {/* 2. Sticky Mobile Top Bar */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-black tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">جيستوك</span>
        </div>
        
        {/* Mobile Header Actions */}
        <div className="flex items-center gap-2" dir="rtl">
          {/* Google Sheets Sync Trigger on Mobile */}
          <button
            onClick={() => setIsMobileSyncOpen(true)}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
              googleUser 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-300'
            }`}
            title="مزامنة قوقل شيت"
          >
            <Cloud className="w-4 h-4" />
            {googleUser && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 tracking-wider">محمد إ.</span>
          </div>
        </div>
      </header>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">

        
        {/* Dynamic component mounting */}
        {currentView === 'dashboard' && (
          <Dashboard 
            products={products}
            sales={sales}
            onNavigateToStock={() => setCurrentView('stock')}
            onNavigateToSales={() => setCurrentView('sales')}
            onViewReceipt={(sale) => setSelectedReceiptSale(sale)}
          />
        )}

        {currentView === 'stock' && (
          <StockManager 
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {currentView === 'sales' && (
          <SalesManager 
            products={products}
            sales={sales}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
            onViewReceipt={(sale) => setSelectedReceiptSale(sale)}
            onOpenReceiptModal={(sale) => setSelectedReceiptSale(sale)}
          />
        )}

      </main>

      {/* 4. Sticky Bottom Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 text-white border-t border-slate-800 z-40 flex justify-around p-1 shadow-2xl h-[68px]">
        
        {/* Tab Trigger: Dashboard */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${
            currentView === 'dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold mt-1">الرئيسية</span>
        </button>

        {/* Tab Trigger: Stock */}
        <button
          onClick={() => setCurrentView('stock')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${
            currentView === 'stock' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className={`w-5 h-5 ${currentView === 'stock' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold mt-1">المخزون</span>
        </button>

        {/* Tab Trigger: Sales */}
        <button
          onClick={() => setCurrentView('sales')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${
            currentView === 'sales' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className={`w-5 h-5 ${currentView === 'sales' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold mt-1">المبيعات</span>
        </button>

      </nav>

      {/* 5. Virtual Thermal Receipt popover overlay */}
      {selectedReceiptSale && (
        <ReceiptModal 
          sale={selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* 6. Mobile Google Sheets Sync Modal Overlay */}
      {isMobileSyncOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-right space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button 
              onClick={() => setIsMobileSyncOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2" dir="rtl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-base font-extrabold text-slate-100">مزامنة Google Sheets</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                اربط حسابك لتتم مزامنة بيانات المخزون والمبيعات في جدول بيانات Google Sheets الخاص بك تلقائياً.
              </p>
            </div>

            {/* Content consistent with sidebar */}
            <div className="space-y-4">
              {!googleUser ? (
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 bg-white text-slate-900 hover:bg-slate-100 px-4 py-3 rounded-xl font-extrabold text-xs transition-all shadow-lg cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3s2.822-6.3 6.3-6.3c1.543 0 2.943.557 4.029 1.472l3.128-3.128C19.114 2.129 15.9.9 12.24.9 6.086.9.9 6.086.9 12.24s5.186 11.34 11.34 11.34c6.243 0 11.34-5.097 11.34-11.34 0-.771-.086-1.5-.214-2.186H12.24z"/>
                    </svg>
                    <span>ربط حساب Google</span>
                  </button>
                  
                  {authError && (
                    <div className="bg-rose-950/40 border border-rose-900/50 p-3.5 rounded-xl space-y-2.5 text-right">
                      <p className="text-xs text-rose-300 leading-relaxed font-bold">{authError}</p>
                      <button
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>افتح التطبيق في علامة تبويب جديدة</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google User Profile */}
                  <div className="flex items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0" dir="rtl">
                      <img 
                        src={googleUser.photoURL || ''} 
                        alt={googleUser.displayName || ''} 
                        className="w-9 h-9 rounded-full border border-indigo-500/50 shrink-0" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="min-w-0 text-right">
                        <p className="text-xs font-black text-slate-100 truncate">{googleUser.displayName}</p>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5 justify-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                          حسابك متصل بقوقل
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        handleGoogleLogout();
                        setIsMobileSyncOpen(false);
                      }}
                      title="تسجيل الخروج"
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions depending on sheet creation */}
                  {!sheetId ? (
                    <button
                      onClick={handleCreateSheetDb}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-55"
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span>{isSyncing ? 'جاري إنشاء جدول البيانات...' : 'إنشاء قاعدة بيانات Google Sheets'}</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleForceSync()}
                          disabled={isSyncing}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-55"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'مزامنة...' : 'تزامن البيانات الآن'}</span>
                        </button>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 rounded-xl font-bold text-xs transition-all border border-slate-700/50"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح الشيت</span>
                        </a>
                      </div>
                      
                      {syncStatus === 'success' && (
                        <p className="text-xs text-center text-emerald-400 font-bold bg-emerald-500/5 py-2 rounded-lg border border-emerald-500/10">تمت المزامنة بنجاح! ✅</p>
                      )}
                      {syncStatus === 'error' && (
                        <p className="text-xs text-center text-rose-400 font-bold bg-rose-500/5 py-2 rounded-lg border border-rose-500/10">فشلت المزامنة. أعد المحاولة ❌</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-500 text-center leading-relaxed">
              يتم حفظ أي تغييرات في المخزون أو المبيعات تلقائياً على Google Sheets بعد تفعيل الربط.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
