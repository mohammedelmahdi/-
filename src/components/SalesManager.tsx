import { useState, useMemo, FormEvent } from 'react';
import { Product, Sale, formatCurrency } from '../types';
import { 
  ShoppingCart, 
  History, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle, 
  Search, 
  Printer, 
  Calendar, 
  X,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface SalesManagerProps {
  products: Product[];
  sales: Sale[];
  onAddSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
  onDeleteSale: (saleId: string) => void;
  onViewReceipt: (sale: Sale) => void;
  onOpenReceiptModal: (sale: Sale) => void;
}

export default function SalesManager({ 
  products, 
  sales, 
  onAddSale, 
  onDeleteSale,
  onOpenReceiptModal 
}: SalesManagerProps) {
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'new_sale' | 'history'>('new_sale');

  // Confirmation modal state for deleting sale
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Cart State for POS Caisse
  interface CartItem {
    product: Product;
    quantity: number; // cartons or pairs count
    sellType: 'carton' | 'pair';
    customPrice?: number; // Optional custom price per unit
  }

  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [saleError, setSaleError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);

  // Search History State
  const [historySearch, setHistorySearch] = useState('');

  // Filter products available for selling (quantity > 0 or searchable)
  const sellableProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            p.sku.toLowerCase().includes(productSearch.toLowerCase());
      return matchesSearch && p.quantity > 0;
    });
  }, [products, productSearch]);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    setSaleSuccess(false);
    setSaleError('');
    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.product.id === product.id);
      
      // Default to carton always
      const defaultSellType: 'carton' | 'pair' = 'carton';
      
      if (existingIdx > -1) {
        const nextCart = [...prevCart];
        const currentItem = nextCart[existingIdx];
        const nextQty = currentItem.quantity + 1;
        
        // Stock Validation (Always carton)
        const maxCartons = product.cartonsCount !== undefined ? product.cartonsCount : Math.floor(product.quantity / (product.pairsPerCarton || 12));
        if (nextQty > maxCartons) {
          setSaleError(`المخزون غير كافٍ لـ "${product.name}". الحد الأقصى المتاح: ${maxCartons} كرتون`);
          return prevCart;
        }
        
        nextCart[existingIdx] = {
          ...currentItem,
          quantity: nextQty
        };
        return nextCart;
      } else {
        // Stock Validation for first item
        const maxCartons = product.cartonsCount !== undefined ? product.cartonsCount : Math.floor(product.quantity / (product.pairsPerCarton || 12));
        if (maxCartons <= 0) {
          setSaleError(`لا يتوفر أي كرتون في المخزن لـ "${product.name}".`);
          return prevCart;
        }
        return [...prevCart, { product, quantity: 1, sellType: defaultSellType }];
      }
    });
  };

  // Update cart quantities
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setSaleError('');
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return item;
          
          const freshProduct = products.find(p => p.id === productId) || item.product;
          
          if (item.sellType === 'carton') {
            const maxCartons = freshProduct.cartonsCount !== undefined ? freshProduct.cartonsCount : Math.floor(freshProduct.quantity / (freshProduct.pairsPerCarton || 12));
            if (nextQty > maxCartons) {
              setSaleError(`المخزون غير كافٍ لـ "${item.product.name}". الحد الأقصى المتاح: ${maxCartons} كرتون`);
              return item;
            }
          } else {
            if (nextQty > freshProduct.quantity) {
              setSaleError(`المخزون غير كافٍ لـ "${item.product.name}". الحد الأقصى المتاح: ${freshProduct.quantity} زوج`);
              return item;
            }
          }
          
          return { ...item, quantity: nextQty };
        }
        return item;
      });
    });
  };

  // Update cart sell type (carton vs pair)
  const handleUpdateCartSellType = (productId: string, sellType: 'carton' | 'pair') => {
    setSaleError('');
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const freshProduct = products.find(p => p.id === productId) || item.product;
          
          if (sellType === 'carton') {
            const maxCartons = freshProduct.cartonsCount !== undefined ? freshProduct.cartonsCount : Math.floor(freshProduct.quantity / (freshProduct.pairsPerCarton || 12));
            if (maxCartons === 0) {
              setSaleError(`لا توجد كراتين كافية لـ "${item.product.name}". تم البيع بالزوج فقط.`);
              return item;
            }
          }
          
          // Reset to 1 and clear custom price to avoid incorrect pricing
          return { ...item, sellType, quantity: 1, customPrice: undefined };
        }
        return item;
      });
    });
  };

  // Update cart item price
  const handleUpdateCartPrice = (productId: string, price: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            customPrice: isNaN(price) || price < 0 ? undefined : price
          };
        }
        return item;
      });
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = (productId: string) => {
    setSaleError('');
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Validate and submit multi-item sale
  const handleValidateSale = (e: FormEvent) => {
    e.preventDefault();
    setSaleError('');
    setSaleSuccess(false);

    if (cart.length === 0) {
      return setSaleError('يرجى إضافة سلع إلى السلة أولاً.');
    }

    // Check stock
    for (const item of cart) {
      const freshProduct = products.find(p => p.id === item.product.id);
      if (!freshProduct) {
        return setSaleError(`المنتج "${item.product.name}" لم يعد متوفراً في النظام.`);
      }
      
      if (item.sellType === 'carton') {
        const neededPairs = item.quantity * (freshProduct.pairsPerCarton || 12);
        if (neededPairs > freshProduct.quantity) {
          return setSaleError(`الكمية المطلوبة من "${item.product.name}" (${item.quantity} كرتون = ${neededPairs} زوج) تتجاوز المتوفر بالمخزن (${freshProduct.quantity} زوج).`);
        }
      } else {
        if (item.quantity > freshProduct.quantity) {
          return setSaleError(`الكمية المطلوبة من "${item.product.name}" (${item.quantity} زوج) تتجاوز المتوفر بالمخزن (${freshProduct.quantity} زوج).`);
        }
      }
    }

    let totalAmount = 0;
    let totalPairs = 0;
    let totalCost = 0;

    const saleItems = cart.map(item => {
      const freshProduct = products.find(p => p.id === item.product.id)!;
      const pairsPerCtn = freshProduct.pairsPerCarton || 12;
      
      const singleBuying = freshProduct.singlePairBuyingPrice || freshProduct.buyingPrice;
      const singleSelling = freshProduct.singlePairSellingPrice || freshProduct.sellingPrice;
      
      const cartonBuying = freshProduct.buyingPricePerCarton || (singleBuying * pairsPerCtn);
      const cartonSelling = freshProduct.sellingPricePerCarton || (singleSelling * pairsPerCtn);

      let itemTotalPrice = 0;
      let itemTotalPairs = 0;
      let itemTotalCost = 0;

      const sellingPriceUsed = item.sellType === 'carton'
        ? (item.customPrice !== undefined ? (item.customPrice * pairsPerCtn) : cartonSelling)
        : (item.customPrice !== undefined ? item.customPrice : singleSelling);

      if (item.sellType === 'carton') {
        itemTotalPrice = item.quantity * sellingPriceUsed;
        itemTotalPairs = item.quantity * pairsPerCtn;
        itemTotalCost = item.quantity * cartonBuying;
      } else {
        itemTotalPrice = item.quantity * sellingPriceUsed;
        itemTotalPairs = item.quantity;
        itemTotalCost = item.quantity * singleBuying;
      }

      totalAmount += itemTotalPrice;
      totalPairs += itemTotalPairs;
      totalCost += itemTotalCost;

      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: itemTotalPairs, // total pairs sold
        buyingPriceAtSale: item.sellType === 'carton' ? cartonBuying : singleBuying,
        sellingPriceAtSale: sellingPriceUsed,
        totalPrice: itemTotalPrice,
        
        // Wholesale details
        sellType: item.sellType,
        cartonsQuantity: item.sellType === 'carton' ? item.quantity : 0,
        pairsQuantity: item.sellType === 'pair' ? item.quantity : 0,
        sku: freshProduct.sku,
        imageUrl: freshProduct.imageUrl
      };
    });

    // Concatenate names or summary
    let combinedName = '';
    if (cart.length === 1) {
      combinedName = cart[0].product.name;
    } else {
      combinedName = `${cart[0].product.name} (+${cart.length - 1} موديلات)`;
    }

    onAddSale({
      productId: cart[0].product.id, // For backwards compatibility
      productName: combinedName,
      quantity: totalPairs,
      totalPrice: totalAmount,
      buyingPriceAtSale: totalCost / totalPairs, // Average buying price per pair for dashboard compatibility
      sellingPriceAtSale: totalAmount / totalPairs, // Average selling price per pair
      items: saleItems
    });

    // Reset state & show success trigger
    setSaleSuccess(true);
    setCart([]);
    setProductSearch('');
    
    setTimeout(() => {
      setSaleSuccess(false);
    }, 4000);
  };

  // 5. Filter Sales History list
  const filteredSalesHistory = useMemo(() => {
    const list = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!historySearch.trim()) return list;
    
    return list.filter(s => 
      s.productName.toLowerCase().includes(historySearch.toLowerCase()) || 
      s.id.toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [sales, historySearch]);

  return (
    <div id="sales-section" className="space-y-6 text-right" dir="rtl">
      
      {/* Sales Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          id="tab-new-sale"
          onClick={() => { setActiveTab('new_sale'); setSaleError(''); }}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all h-14 cursor-pointer ${
            activeTab === 'new_sale' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-indigo-400" />
          <span>بيع جديد (الصندوق)</span>
        </button>
        <button 
          id="tab-sales-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all h-14 cursor-pointer ${
            activeTab === 'history' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-indigo-400" />
          <span>سجل المبيعات</span>
        </button>
      </div>

      {/* POS Caisse Interface Panel */}
      {activeTab === 'new_sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Product Search & Selector (7 columns) */}
          <div className="lg:col-span-7 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-right">
            <h3 className="text-lg font-bold text-slate-100">1. البحث واختيار السلعة / المنتج</h3>
            
            {/* Search Input inside POS */}
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="امسح الباركود أو ابحث عن طريق الاسم أو رمز SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl h-12 text-slate-200 placeholder-slate-500 text-right"
              />
              {productSearch && (
                <button 
                  onClick={() => setProductSearch('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Product list grid with instant click triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pl-1 text-right">
              {sellableProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                  {products.length === 0 ? (
                    <p className="text-sm font-semibold">المخزن فارغ. يرجى إضافة منتجات في المخزون أولاً.</p>
                  ) : (
                    <p className="text-sm font-semibold">لا تتوفر أي منتجات مطابقة للبحث.</p>
                  )}
                </div>
              ) : (
                sellableProducts.map((p) => {
                  const cartItem = cart.find(item => item.product.id === p.id);
                  const inCartCount = cartItem ? cartItem.quantity : 0;
                  const cartons = p.cartonsCount !== undefined ? p.cartonsCount : Math.floor(p.quantity / (p.pairsPerCarton || 12));
                  const isLow = cartons < 3;
                  const shoeImg = p.imageUrl || '👟';
                  const isUrlImage = shoeImg.startsWith('http') || shoeImg.startsWith('data:');
                  
                  const pSingleSelling = p.singlePairSellingPrice || p.sellingPrice;
                  const pCartonSelling = p.sellingPricePerCarton || (pSingleSelling * (p.pairsPerCarton || 12));

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className={`text-right p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer h-24 ${
                        inCartCount > 0 
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-lg scale-[1.01]' 
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/25 hover:bg-slate-950/50'
                      }`}
                    >
                      {/* Shoe Image Box */}
                      <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-xl shadow-inner">
                        {isUrlImage ? (
                          <img src={shoeImg} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{shoeImg}</span>
                        )}
                      </div>

                      <div className="min-w-0 text-right flex-1 flex flex-col justify-between h-full py-0.5">
                        <div>
                          <div className="flex items-center justify-between gap-1" dir="rtl">
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                              {p.sku}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isLow ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {cartons} كرتون
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-200 leading-tight truncate mt-1">{p.name}</h4>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-1 text-[11px]" dir="rtl">
                          <span className="text-slate-400">الكرتون: <strong className="text-slate-100">{formatCurrency(pCartonSelling)}</strong></span>
                          {inCartCount > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-600 rounded-full text-white text-[9px] font-bold">
                              {cartItem?.sellType === 'carton' ? `${inCartCount} كرتون` : `${inCartCount} زوج`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* POS Cart Summary (5 columns) */}
          <div className="lg:col-span-5 space-y-4 text-right">
            
            {/* Feedback messages */}
            {saleSuccess && (
              <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-2.5 shadow-xl animate-pulse text-right" dir="rtl">
                <Check className="w-5 h-5 bg-emerald-600 text-white rounded-full p-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">تم تسجيل عملية البيع!</p>
                  <p className="text-xs text-emerald-400/90">تم تحديث كمية المخزون وسجل المبيعات وقالب قوقل شيت بنجاح.</p>
                </div>
              </div>
            )}

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">2. سلة المبيعات ({cart.length} سلع)</h3>
                {cart.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => { setCart([]); setSaleError(''); }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    تفريغ السلة
                  </button>
                )}
              </div>

              {saleError && (
                <div className="p-3 bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20 flex items-center gap-2" dir="rtl">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                  <span>{saleError}</span>
                </div>
              )}

              {cart.length > 0 ? (
                <form onSubmit={handleValidateSale} className="space-y-6">
                  
                  {/* Cart list items layout */}
                  <div className="space-y-4 max-h-[340px] overflow-y-auto pl-1">
                    {cart.map((item) => {
                      const pairsPerCarton = item.product.pairsPerCarton || 12;
                      const pSingleSelling = item.product.singlePairSellingPrice || item.product.sellingPrice;
                      const pCartonSelling = item.product.sellingPricePerCarton || (pSingleSelling * pairsPerCarton);
                      
                      const unitPrice = item.sellType === 'carton'
                        ? (item.customPrice !== undefined ? (item.customPrice * pairsPerCarton) : pCartonSelling)
                        : (item.customPrice !== undefined ? item.customPrice : pSingleSelling);
                      const lineTotal = unitPrice * item.quantity;
                      
                      const shoeImg = item.product.imageUrl || '👟';
                      const isUrlImage = shoeImg.startsWith('http') || shoeImg.startsWith('data:');

                      return (
                        <div key={item.product.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-3 text-right">
                          <div className="flex items-start gap-2.5">
                            {/* Product mini icon */}
                            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-lg shadow-inner">
                              {isUrlImage ? (
                                <img src={shoeImg} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{shoeImg}</span>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono bg-indigo-500/5 px-1.5 py-0.5 rounded-md">
                                  {item.product.sku}
                                </span>
                              </div>
                              <h4 className="text-xs font-extrabold text-slate-100 mt-1 leading-tight truncate">{item.product.name}</h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Dynamic Custom Selling Price Input */}
                          <div className="flex flex-col gap-1.5 bg-slate-900/40 p-2 rounded-xl border border-slate-800/60 mt-0.5" dir="rtl">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold shrink-0">تعديل سعر الحذاء (الزوج):</span>
                              <div className="flex items-center gap-1.5">
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={item.customPrice !== undefined ? item.customPrice : pSingleSelling}
                                    onChange={(e) => handleUpdateCartPrice(item.product.id, parseFloat(e.target.value))}
                                    placeholder={String(pSingleSelling)}
                                    className="w-24 bg-slate-950 text-slate-100 font-extrabold text-xs px-2 py-1 rounded-lg border border-slate-800 text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="absolute left-1.5 top-1 text-[9px] text-slate-500 font-bold">د.ج</span>
                                </div>
                                {item.customPrice !== undefined && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartPrice(item.product.id, NaN)}
                                    className="text-[9px] text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
                                    title="إعادة السعر الافتراضي"
                                  >
                                    افتراضي
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Calculated Carton Price */}
                            <div className="flex items-center justify-between text-[10px] border-t border-slate-900/60 pt-1 text-slate-400">
                              <span>سعر الكرتون المحتسب ({pairsPerCarton} أزواج):</span>
                              <span className="font-extrabold text-indigo-400 font-mono">
                                {formatCurrency(unitPrice)}
                              </span>
                            </div>
                          </div>

                          {/* Segmented Control & Qty Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-slate-900 pt-2.5" dir="rtl">
                            
                            {/* Sell Type Indicator (Carton only) */}
                            <div className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10 w-full sm:w-auto text-center shrink-0">
                              بيع بالكرتون (جملة)
                            </div>

                            {/* Quantity control */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                                  disabled={item.quantity <= 1}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-950 hover:bg-slate-800 disabled:opacity-40 rounded-md text-slate-200 transition-colors cursor-pointer text-xs"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="w-8 text-center font-extrabold text-xs text-slate-100">
                                  {item.quantity} {item.sellType === 'carton' ? 'كرتون' : 'زوج'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-950 hover:bg-slate-800 disabled:opacity-40 rounded-md text-slate-200 transition-colors cursor-pointer text-xs"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              <span className="text-xs font-bold text-slate-200 text-left shrink-0">
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pricing recap details */}
                  <div className="space-y-3 pt-4 border-t border-slate-800 text-right">
                    <div className="flex justify-between text-xs text-slate-400" dir="rtl">
                      <span>المجموع الفرعي</span>
                      <span>
                        {formatCurrency(cart.reduce((sum, item) => {
                          const pairsPerCarton = item.product.pairsPerCarton || 12;
                          const pSingle = item.product.singlePairSellingPrice || item.product.sellingPrice;
                          const pCarton = item.product.sellingPricePerCarton || (pSingle * pairsPerCarton);
                          const price = item.sellType === 'carton'
                            ? (item.customPrice !== undefined ? (item.customPrice * pairsPerCarton) : pCarton)
                            : (item.customPrice !== undefined ? item.customPrice : pSingle);
                          return sum + (price * item.quantity);
                        }, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-slate-100 pt-2 border-t border-slate-800 border-dashed" dir="rtl">
                      <span>الإجمالي الصافي للبيع</span>
                      <span className="text-lg text-indigo-400 font-extrabold">
                        {formatCurrency(cart.reduce((sum, item) => {
                          const pairsPerCarton = item.product.pairsPerCarton || 12;
                          const pSingle = item.product.singlePairSellingPrice || item.product.sellingPrice;
                          const pCarton = item.product.sellingPricePerCarton || (pSingle * pairsPerCarton);
                          const price = item.sellType === 'carton'
                            ? (item.customPrice !== undefined ? (item.customPrice * pairsPerCarton) : pCarton)
                            : (item.customPrice !== undefined ? item.customPrice : pSingle);
                          return sum + (price * item.quantity);
                        }, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Submit sale */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition duration-200 shadow-lg shadow-emerald-900/20 h-12 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                    تأكيد وتسجيل عملية البيع
                  </button>

                </form>
              ) : (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800/60 text-center">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-full">
                    <ShoppingCart className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">سلة المبيعات فارغة</p>
                  <p className="text-xs max-w-[200px]">اضغط على المنتجات المتوفرة في القائمة اليمنى لإضافتها إلى السلة والبدء بالبيع.</p>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* Historical Sales Log */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          
          {/* History Filters & Search */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="ابحث عن طريق اسم المنتج أو معرف الفاتورة..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl h-12 text-slate-200 placeholder-slate-500 text-right font-sans"
              />
              {historySearch && (
                <button 
                  onClick={() => setHistorySearch('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table / Cards list for sales logs */}
          {filteredSalesHistory.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center shadow-xl">
              <div className="p-4 bg-slate-950 border border-slate-800 text-slate-500 rounded-full mb-4">
                <History className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-300">لا توجد مبيعات مطابقة</p>
              <p className="text-xs text-slate-500 mt-1">لم تقم بإجراء أي عمليات بيع تطابق عملية البحث هذه بعد.</p>
            </div>
          ) : (
            <>
              {/* Mobile View list */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredSalesHistory.map((sale) => (
                  <div key={sale.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3 text-right">
                    <div className="flex items-start justify-between" dir="rtl">
                      <div className="text-right">
                        <p className="text-[10px] font-bold font-mono text-slate-500 uppercase">المعرف: {sale.id.slice(0, 8)}</p>
                        <h4 className="text-sm font-bold text-slate-200 mt-0.5">{sale.productName}</h4>
                      </div>
                      <span className="text-sm font-extrabold text-slate-100">
                        {formatCurrency(sale.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80" dir="rtl">
                      <span>الكمية: <strong>{sale.quantity} وحدة</strong></span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(sale.date).toLocaleDateString('ar-DZ')} {new Date(sale.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => onOpenReceiptModal(sale)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-400 font-bold text-xs py-2.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        طباعة الوصل
                      </button>
                      <button 
                        onClick={() => setSaleToDelete(sale)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-400 font-bold text-xs py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف البيع
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View Table */}
              <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <table className="w-full text-right border-collapse" dir="rtl">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-right">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono text-right">معرف البيع</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">التاريخ والوقت</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">اسم المنتج</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الكمية</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">سعر الوحدة</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">الإجمالي الصافي</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredSalesHistory.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-right">
                          <span className="text-xs font-bold font-mono text-slate-400">
                            {sale.id.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400 font-medium text-right">
                          {new Date(sale.date).toLocaleDateString('ar-DZ')} في {new Date(sale.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-4 font-bold text-slate-200 text-sm text-right">
                          {sale.productName}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-300 text-sm">
                          {sale.quantity}
                        </td>
                        <td className="p-4 text-left text-slate-400 font-semibold text-sm">
                          {formatCurrency(sale.sellingPriceAtSale)}
                        </td>
                        <td className="p-4 text-left text-slate-100 font-extrabold text-sm">
                          {formatCurrency(sale.totalPrice)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => onOpenReceiptModal(sale)}
                              className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              الوصل
                            </button>
                            <button 
                              onClick={() => setSaleToDelete(sale)}
                              className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="حذف عملية البيع"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      )}

      {/* Custom Sale Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn" dir="rtl">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 p-6 space-y-6 text-right">
            
            {/* Header / Warning icon */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-100">تأكيد حذف عملية البيع</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  هل أنت متأكد من رغبتك في إلغاء عملية البيع هذه؟ سيتم حذف العملية بالكامل وسيتم إرجاع كميات المنتجات المباعة تلقائياً إلى مخزن المحل.
                </p>
              </div>
            </div>

            {/* Sale details preview */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-2 text-right">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">رقم الفاتورة:</span>
                <span className="font-mono font-bold text-slate-300 uppercase">{saleToDelete.id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">المنتج:</span>
                <span className="font-bold text-slate-200">{saleToDelete.productName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">الكمية المسترجعة:</span>
                <span className="font-bold text-slate-200">{saleToDelete.quantity} زوج</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-bold">المبلغ المسترد:</span>
                <span className="font-extrabold text-emerald-400">{formatCurrency(saleToDelete.totalPrice)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setSaleToDelete(null)}
                className="flex-1 border border-slate-800 text-slate-400 font-bold text-xs py-3 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors h-11 cursor-pointer"
              >
                إلغاء
              </button>
              <button 
                onClick={() => {
                  onDeleteSale(saleToDelete.id);
                  setSaleToDelete(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs py-3 rounded-xl transition-all h-11 shadow-lg shadow-rose-900/20 cursor-pointer"
              >
                نعم، احذف وأرجع المخزون
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
