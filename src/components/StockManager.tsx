import { useState, useMemo, FormEvent } from 'react';
import { Product, formatCurrency } from '../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter, 
  AlertCircle, 
  CheckCircle, 
  X,
  XCircle,
  Hash,
  ChevronDown
} from 'lucide-react';

interface StockManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const PRESET_CATEGORIES = ["أحذية رياضية", "أحذية كلاسيكية", "أحذية نسائية", "أحذية شتوية/بوت", "صنادل وشباشب", "أحذية أطفال", "أخرى"];

const SHOE_EMOJI_PRESETS = [
  { emoji: '👟', name: 'حذاء رياضي' },
  { emoji: '👞', name: 'حذاء جلدي كلاسيكي' },
  { emoji: '🥾', name: 'حذاء شتوي / بوت' },
  { emoji: '👠', name: 'حذاء كعب عالي' },
  { emoji: '🩴', name: 'صندل / شبشب صيفي' },
  { emoji: '👶', name: 'حذاء أطفال' },
  { emoji: '⚽', name: 'حذاء كرة قدم' },
  { emoji: '🥿', name: 'حذاء خفيف' }
];

export default function StockManager({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct 
}: StockManagerProps) {
  
  // State for search & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  
  // Wholesale Specific Form States
  const [cartonsCount, setCartonsCount] = useState<number>(10);
  const [pairsPerCarton, setPairsPerCarton] = useState<number>(12);
  const [singlePairBuyingPrice, setSinglePairBuyingPrice] = useState<number>(1000);
  const [singlePairSellingPrice, setSinglePairSellingPrice] = useState<number>(1500);
  const [imageUrl, setImageUrl] = useState<string>(SHOE_EMOJI_PRESETS[0].emoji);
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [useCustomUrl, setUseCustomUrl] = useState<boolean>(false);

  const [formError, setFormError] = useState('');

  // 1. Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Extract actual unique categories from current products to expand list if needed
  const categoriesList = useMemo(() => {
    const list = new Set(PRESET_CATEGORIES);
    products.forEach(p => {
      if (p.category) list.add(p.category);
    });
    return Array.from(list);
  }, [products]);

  // Open Modal for Create or Update
  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      
      // Load wholesale shoe specific properties or provide defaults if legacy product
      const productCartons = product.cartonsCount !== undefined ? product.cartonsCount : Math.max(1, Math.ceil(product.quantity / (product.pairsPerCarton || 12)));
      const productPairsPerCtn = product.pairsPerCarton !== undefined ? product.pairsPerCarton : 12;
      const productSinglePairBuying = product.singlePairBuyingPrice !== undefined ? product.singlePairBuyingPrice : product.buyingPrice;
      const productSinglePairSelling = product.singlePairSellingPrice !== undefined ? product.singlePairSellingPrice : product.sellingPrice;
      
      setCartonsCount(productCartons);
      setPairsPerCarton(productPairsPerCtn);
      setSinglePairBuyingPrice(productSinglePairBuying);
      setSinglePairSellingPrice(productSinglePairSelling);
      
      const prodImg = product.imageUrl || '👟';
      if (prodImg.startsWith('http') || prodImg.startsWith('data:')) {
        setUseCustomUrl(true);
        setCustomImageUrl(prodImg);
        setImageUrl('👟');
      } else {
        setUseCustomUrl(false);
        setImageUrl(prodImg);
        setCustomImageUrl('');
      }
    } else {
      setEditingProduct(null);
      setName('');
      // Auto generate SKU for shoes
      setSku(`SHO-${Math.floor(100 + Math.random() * 900)}`);
      setCategory(PRESET_CATEGORIES[0]);
      setCartonsCount(10);
      setPairsPerCarton(12);
      setSinglePairBuyingPrice(1200);
      setSinglePairSellingPrice(1800);
      setImageUrl('👟');
      setCustomImageUrl('');
      setUseCustomUrl(false);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!name.trim()) return setFormError('اسم الموديل/الحذاء مطلوب.');
    if (!sku.trim()) return setFormError('رمز SKU مطلوب.');
    if (cartonsCount < 0) return setFormError('عدد الكراتين لا يمكن أن يكون أقل من الصفر.');
    if (pairsPerCarton <= 0) return setFormError('عدد الأحذية في الكرتون يجب أن يكون أكبر من الصفر.');
    if (singlePairBuyingPrice <= 0) return setFormError('سعر شراء الحذاء يجب أن يكون أكبر من 0 د.ج.');
    if (singlePairSellingPrice <= 0) return setFormError('سعر بيع الحذاء يجب أن يكون أكبر من 0 د.ج.');
    if (singlePairSellingPrice < singlePairBuyingPrice) return setFormError('تنبيه: سعر بيع الحذاء أقل من سعر الشراء.');

    const finalImageUrl = useCustomUrl ? (customImageUrl.trim() || '👟') : imageUrl;

    const computedQuantity = cartonsCount * pairsPerCarton;
    const computedBuyingCarton = pairsPerCarton * singlePairBuyingPrice;
    const computedSellingCarton = pairsPerCarton * singlePairSellingPrice;

    const payload: Omit<Product, 'id'> & { id?: string } = {
      name: name.trim(),
      sku: sku.toUpperCase().trim(),
      category,
      quantity: computedQuantity,
      buyingPrice: singlePairBuyingPrice, // single pair buying price for fallback
      sellingPrice: singlePairSellingPrice, // single pair selling price for fallback
      
      // New wholesale fields
      cartonsCount,
      pairsPerCarton,
      singlePairBuyingPrice,
      singlePairSellingPrice,
      buyingPricePerCarton: computedBuyingCarton,
      sellingPricePerCarton: computedSellingCarton,
      imageUrl: finalImageUrl
    };

    if (editingProduct) {
      onUpdateProduct({ ...payload, id: editingProduct.id } as Product);
    } else {
      // Check duplicate SKU
      if (products.some(p => p.sku.toUpperCase() === payload.sku)) {
        return setFormError('رمز SKU هذا مستخدم بالفعل لمنتج آخر.');
      }
      onAddProduct(payload as Product);
    }

    setIsModalOpen(false);
  };

  // Handle Delete with custom confirmation modal instead of blocked window.confirm
  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  return (
    <div id="stock-section" className="space-y-6 text-right" dir="rtl">
      
      {/* Title and Add Button Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100">إدارة المخزون</h2>
          <p className="text-xs text-slate-400 mt-0.5">تتبع سلعك ومنتجاتك وقم بتحديثها في الوقت الفعلي.</p>
        </div>
        <button 
          id="btn-add-product-trigger"
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition duration-200 shadow-lg shadow-indigo-900/20 h-12 w-full sm:w-auto cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          إضافة منتج جديد
        </button>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row gap-3">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث عن طريق الاسم أو رمز SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-11 pl-4 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl h-12 text-slate-200 placeholder-slate-500 text-right"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filter dropdown */}
        <div className="relative w-full md:w-64">
          <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pr-10 pl-10 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl h-12 text-slate-200 appearance-none font-medium cursor-pointer text-right"
          >
            <option value="Tous">جميع الفئات</option>
            {categoriesList.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Products Grid/Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center shadow-xl">
          <div className="p-4 bg-slate-950 text-slate-500 rounded-full mb-4 border border-slate-800">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-slate-300">لم يتم العثور على أي منتج</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">حاول تعديل معايير البحث أو ابدأ بإضافة منتج جديد للمخزن.</p>
        </div>
      ) : (
        <>
          {/* Mobile Product Card Layout (Shows on screens < 768px) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredProducts.map((product) => {
              const isLowStock = product.cartonsCount !== undefined ? product.cartonsCount < 3 : product.quantity < 24;
              const isOutOfStock = product.cartonsCount !== undefined ? product.cartonsCount === 0 : product.quantity === 0;
              const shoeImg = product.imageUrl || '👟';
              const isUrlImage = shoeImg.startsWith('http') || shoeImg.startsWith('data:');
              
              const pSingleBuying = product.singlePairBuyingPrice || product.buyingPrice;
              const pSingleSelling = product.singlePairSellingPrice || product.sellingPrice;
              const pCartonBuying = product.buyingPricePerCarton || (pSingleBuying * (product.pairsPerCarton || 12));
              const pCartonSelling = product.sellingPricePerCarton || (pSingleSelling * (product.pairsPerCarton || 12));
              const pCartons = product.cartonsCount !== undefined ? product.cartonsCount : Math.floor(product.quantity / (product.pairsPerCarton || 12));
              const pPairsPerCtn = product.pairsPerCarton || 12;

              return (
                <div 
                  key={product.id} 
                  className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Shoe picture container */}
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-2xl shadow-inner">
                      {isUrlImage ? (
                        <img src={shoeImg} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{shoeImg}</span>
                      )}
                    </div>

                    <div className="min-w-0 text-right flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono uppercase">
                          {product.sku}
                        </span>
                        <span className="text-[10px] font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/50">
                          {product.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-100 mt-1.5 leading-snug truncate">{product.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">عدد الكراتين: <strong className="text-emerald-400">{pCartons} كرتون</strong> ({pPairsPerCtn} زوج بالكرتون)</p>
                    </div>

                    {/* Stock status badge */}
                    <div className="shrink-0">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                          نفذت
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                          قليل ({pCartons})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          متوفر
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 rounded-xl p-3 border border-slate-800/80 text-right text-xs" dir="rtl">
                    <div className="border-l border-slate-800/80 pl-2">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">سعر الحذاء الواحد</p>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-400">الشراء: <span className="font-semibold text-slate-300">{formatCurrency(pSingleBuying)}</span></p>
                        <p className="text-xs text-slate-100 font-extrabold">البيع: <span className="text-emerald-400">{formatCurrency(pSingleSelling)}</span></p>
                      </div>
                    </div>
                    <div className="pr-2">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">سعر الكرتون (تلقائي)</p>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-400">الشراء: <span className="font-semibold text-slate-300">{formatCurrency(pCartonBuying)}</span></p>
                        <p className="text-xs text-slate-100 font-extrabold">البيع: <span className="text-emerald-400">{formatCurrency(pCartonSelling)}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-400 font-bold text-xs py-2.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDelete(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-400 font-bold text-xs py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout (Shows on screens >= 768px) */}
          <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <table className="w-full text-right border-collapse" dir="rtl">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-right">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono text-right">الموديل / الرمز</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">الفئة</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">المخزون (كرتون)</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">سعر الحذاء الواحد</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">سعر الكرتون (تلقائي)</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">هامش ربح الكرتون</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الحالة</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((product) => {
                  const isLowStock = product.cartonsCount !== undefined ? product.cartonsCount < 3 : product.quantity < 24;
                  const isOutOfStock = product.cartonsCount !== undefined ? product.cartonsCount === 0 : product.quantity === 0;

                  const pSingleBuying = product.singlePairBuyingPrice || product.buyingPrice;
                  const pSingleSelling = product.singlePairSellingPrice || product.sellingPrice;
                  const pCartonBuying = product.buyingPricePerCarton || (pSingleBuying * (product.pairsPerCarton || 12));
                  const pCartonSelling = product.sellingPricePerCarton || (pSingleSelling * (product.pairsPerCarton || 12));
                  const pCartons = product.cartonsCount !== undefined ? product.cartonsCount : Math.floor(product.quantity / (product.pairsPerCarton || 12));
                  const pPairsPerCtn = product.pairsPerCarton || 12;

                  const shoeImg = product.imageUrl || '👟';
                  const isUrlImage = shoeImg.startsWith('http') || shoeImg.startsWith('data:');

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-xl shadow-inner">
                            {isUrlImage ? (
                              <img src={shoeImg} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{shoeImg}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 text-sm leading-snug">{product.name}</p>
                            <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
                              {product.sku}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800 rounded-md border border-slate-700/45">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-bold text-slate-200 text-sm">{pCartons} كرتون</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">({pCartons * pPairsPerCtn} حذاء / {pPairsPerCtn} لكل كرتون)</p>
                      </td>
                      <td className="p-4 text-right text-xs">
                        <p className="text-slate-400">شراء: <span className="font-semibold">{formatCurrency(pSingleBuying)}</span></p>
                        <p className="text-slate-200 font-bold mt-0.5">بيع: <span className="text-emerald-400">{formatCurrency(pSingleSelling)}</span></p>
                      </td>
                      <td className="p-4 text-right text-xs">
                        <p className="text-slate-400">شراء: <span className="font-semibold">{formatCurrency(pCartonBuying)}</span></p>
                        <p className="text-slate-200 font-bold mt-0.5">بيع: <span className="text-indigo-400">{formatCurrency(pCartonSelling)}</span></p>
                      </td>
                      <td className="p-4 text-left text-emerald-400 font-bold text-sm">
                        {formatCurrency(pCartonSelling - pCartonBuying)}
                      </td>
                      <td className="p-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" />
                            غير متوفر
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                            منخفض ({pCartons})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            ممتاز
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenModal(product)}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                            title="تعديل المنتج"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product)}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="حذف المنتج"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CRUD Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 text-right">
              <div>
                <h3 className="text-lg font-bold">
                  {editingProduct ? 'تعديل تفاصيل المنتج' : 'إضافة منتج جديد'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingProduct ? `تعديل : ${editingProduct.name}` : 'يرجى ملء تفاصيل المنتج أدناه.'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-right">
              
              {formError && (
                <div className="p-3 bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/25 flex items-center gap-2 animate-shake">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">اسم السلعة / المنتج</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: هاتف ذكي برو، قميص قطني، قهوة، إلخ..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 placeholder-slate-600 text-right"
                  required
                />
              </div>

              {/* SKU and Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* SKU Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    رمز SKU (فريد)
                  </label>
                  <input 
                    type="text" 
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="مثال: MOB-104"
                    disabled={!!editingProduct} // Disable modifying SKU when editing to avoid database references mismatch
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 font-mono disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 text-right"
                    required
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">الفئة</label>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pr-3.5 pl-10 py-2.5 bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 appearance-none font-medium cursor-pointer text-right"
                    >
                      {PRESET_CATEGORIES.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Wholesale Shoe Quantity Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                
                {/* Cartons Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">عدد الكراتين بالمخزن</label>
                  <input 
                    type="number" 
                    min="0"
                    value={cartonsCount}
                    onChange={(e) => setCartonsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 text-right font-semibold"
                    required
                  />
                </div>

                {/* Pairs per Carton */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">عدد الأحذية في الكرتون</label>
                  <input 
                    type="number" 
                    min="1"
                    value={pairsPerCarton}
                    onChange={(e) => setPairsPerCarton(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 text-right font-semibold"
                    required
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 text-center text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 font-medium">
                  إجمالي عدد الأحذية في المخزن: <strong className="text-indigo-400">{cartonsCount * pairsPerCarton} زوج حذاء</strong>
                </div>
              </div>

              {/* Wholesale Shoe Pricing Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                
                {/* Single Pair Buying Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">سعر شراء الحذاء الواحد (د.ج)</label>
                  <input 
                    type="number" 
                    step="1"
                    min="1"
                    value={singlePairBuyingPrice}
                    onChange={(e) => setSinglePairBuyingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 text-right font-semibold"
                    required
                  />
                </div>

                {/* Single Pair Selling Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">سعر بيع الحذاء الواحد (د.ج)</label>
                  <input 
                    type="number" 
                    step="1"
                    min="1"
                    value={singlePairSellingPrice}
                    onChange={(e) => setSinglePairSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm rounded-xl text-slate-200 text-right font-semibold"
                    required
                  />
                </div>

                {/* Automatically Calculated Carton Prices */}
                <div className="col-span-1 sm:col-span-2 bg-indigo-950/20 rounded-lg p-3 border border-indigo-500/10 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>تكلفة الكرتون الواحد (شراء):</span>
                    <span className="font-bold text-slate-300">{formatCurrency(pairsPerCarton * singlePairBuyingPrice)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>سعر بيع الكرتون الواحد (بيع):</span>
                    <span className="font-extrabold text-indigo-400">{formatCurrency(pairsPerCarton * singlePairSellingPrice)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 border-t border-indigo-500/10 pt-1.5 font-bold">
                    <span>هامش ربح الكرتون الواحد:</span>
                    <span>{formatCurrency(pairsPerCarton * (singlePairSellingPrice - singlePairBuyingPrice))}</span>
                  </div>
                </div>
              </div>

              {/* Shoe Image/Emoji Selection */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">صورة أو أيقونة الحذاء</label>
                  <button 
                    type="button"
                    onClick={() => setUseCustomUrl(!useCustomUrl)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    {useCustomUrl ? "اختيار أيقونة جاهزة" : "استخدام رابط صورة مخصص"}
                  </button>
                </div>

                {useCustomUrl ? (
                  <input 
                    type="url" 
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="ضع رابط الصورة هنا (e.g. https://...)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs rounded-xl text-slate-200 text-left ltr"
                    required
                  />
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {SHOE_EMOJI_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(preset.emoji)}
                        className={`p-2.5 rounded-xl text-xl transition-all border cursor-pointer ${
                          imageUrl === preset.emoji 
                            ? "bg-indigo-600/20 border-indigo-500 scale-105" 
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                        title={preset.name}
                      >
                        {preset.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons Footer */}
              <div className="pt-4 flex gap-3 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-slate-800 text-slate-400 font-bold text-xs py-3 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors h-12 cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs py-3 rounded-xl transition-all h-12 shadow-lg shadow-indigo-900/20 cursor-pointer"
                >
                  {editingProduct ? 'حفظ التغييرات' : 'إضافة المنتج للمخزن'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4" dir="rtl">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 p-6 space-y-6 text-right">
            
            {/* Header / Warning icon */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-100">تأكيد حذف المنتج</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المخزن؟ لا يمكن التراجع عن هذا الإجراء لاحقاً.
                </p>
              </div>
            </div>

            {/* Product details preview card */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-xl font-bold">
                {productToDelete.imageUrl && (productToDelete.imageUrl.startsWith('http') || productToDelete.imageUrl.startsWith('data:')) ? (
                  <img src={productToDelete.imageUrl} alt={productToDelete.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <span>{productToDelete.imageUrl || '👟'}</span>
                )}
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-slate-200 truncate">{productToDelete.name}</p>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-400">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase">{productToDelete.sku}</span>
                  <span>•</span>
                  <span>{productToDelete.category}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 border border-slate-800 text-slate-400 font-bold text-xs py-3 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors h-11 cursor-pointer"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="flex-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs py-3 rounded-xl transition-all h-11 shadow-lg shadow-rose-900/20 cursor-pointer"
              >
                نعم، احذف المنتج
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

