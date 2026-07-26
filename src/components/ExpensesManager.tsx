import { useState, useMemo, FormEvent } from 'react';
import { Expense, PackagingPayment, Sale, formatCurrency } from '../types';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText, 
  TrendingDown, 
  User, 
  Wallet, 
  PackageCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ExpensesManagerProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  
  packagingPayments: PackagingPayment[];
  onAddPackagingPayment: (payment: Omit<PackagingPayment, 'id'>) => void;
  onDeletePackagingPayment: (id: string) => void;
  
  sales: Sale[];
}

const EXPENSE_CATEGORIES = [
  'شحن / نقل',
  'إعلانات / تسويق',
  'إيجار / مقر',
  'رواتب / خدمات',
  'تغليف ومواد',
  'أخرى'
];

export default function ExpensesManager({
  expenses,
  onAddExpense,
  onDeleteExpense,
  packagingPayments,
  onAddPackagingPayment,
  onDeletePackagingPayment,
  sales
}: ExpensesManagerProps) {
  // Expense Form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // Packaging Payment Form state
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  // Active sub-tab inside Expenses view
  const [activeTab, setActiveTab] = useState<'expenses' | 'packaging'>('expenses');

  // Calculations for Packaging
  const totalParcelsPackaged = useMemo(() => {
    return sales.reduce((sum, sale) => sum + (sale.customerColis || 0), 0);
  }, [sales]);

  const packagingPricePerParcel = 100; // 100 DZD per parcel
  
  const totalPackagingCost = totalParcelsPackaged * packagingPricePerParcel;

  const totalPackagingPaid = useMemo(() => {
    return packagingPayments.reduce((sum, pay) => sum + pay.amountPaid, 0);
  }, [packagingPayments]);

  const remainingPackagingBalance = totalPackagingCost - totalPackagingPaid;

  // Calculations for general expenses
  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // Expenses filtered/sorted
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  const sortedPayments = useMemo(() => {
    return [...packagingPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [packagingPayments]);

  // Handle Expense Add
  const handleExpenseSubmit = (e: FormEvent) => {
    e.preventDefault();
    setExpenseError('');

    if (!expenseTitle.trim()) {
      return setExpenseError('يرجى إدخال عنوان المصروف.');
    }
    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return setExpenseError('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
    }

    onAddExpense({
      title: expenseTitle.trim(),
      amount: parsedAmount,
      date: expenseDate,
      category: expenseCategory,
      notes: expenseNotes.trim() || undefined
    });

    // Reset Form
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
  };

  // Handle Packaging Payment Add
  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPayError('');

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return setPayError('يرجى إدخال مبلغ دفع صحيح.');
    }

    onAddPackagingPayment({
      date: payDate,
      amountPaid: parsedAmount,
      notes: payNotes.trim() || undefined
    });

    // Reset Form
    setPayAmount('');
    setPayNotes('');
  };

  return (
    <div className="space-y-6" dir="rtl" id="expenses-manager">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-400" />
            <span>المصاريف وتكاليف التغليف</span>
          </h2>
          <p className="text-xs text-slate-400">تابع جميع مصاريف متجرك، ومستحقات الشخص الذي يقوم بتغليف الطرود (100 د.ج للعلبة)</p>
        </div>

        {/* View Tabs Selector */}
        <div className="bg-slate-900 p-1 rounded-xl flex border border-slate-800">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المصاريف العامة ({formatCurrency(totalExpensesAmount)})
          </button>
          <button
            onClick={() => setActiveTab('packaging')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'packaging'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تتبع مستحقات التغليف ({formatCurrency(remainingPackagingBalance)})
          </button>
        </div>
      </div>

      {/* EXPENSES MANAGEMENT TAB */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Expense Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>تسجيل مصروف جديد</span>
            </h3>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              {expenseError && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{expenseError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">عنوان المصروف *</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="مثال: فاتورة الفيسبوك، إيجار النقل البضاعة..."
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-700 text-right h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">المبلغ (د.ج) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-700 text-right h-10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">فئة المصروف *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-2.5 py-2 text-slate-200 text-right h-10 cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">التاريخ *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2.5 text-slate-200 text-right h-10"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="تفاصيل إضافية حول المصروف..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 placeholder-slate-700 text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة المصروف</span>
              </button>
            </form>
          </div>

          {/* Expenses List & Stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Stats Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">إجمالي المصاريف العامة</span>
                <p className="text-2xl font-black text-white">{formatCurrency(totalExpensesAmount)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            {/* Expenses Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-200">سجل المصاريف الأخيرة</h3>
                <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-1 rounded-lg font-bold">
                  العدد: {expenses.length} مصروف
                </span>
              </div>

              {sortedExpenses.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-slate-500 text-xs">لا توجد مصاريف مسجلة حتى الآن.</p>
                  <p className="text-[10px] text-slate-600">استخدم النموذج على اليمين لتسجيل أول مصروف.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-bold">
                        <th className="p-3">عنوان المصروف</th>
                        <th className="p-3">الفئة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">المبلغ</th>
                        <th className="p-3 text-left">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {sortedExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-800/40 transition-all">
                          <td className="p-3 font-bold text-slate-200">
                            <div>
                              <span>{exp.title}</span>
                              {exp.notes && (
                                <p className="text-[9px] text-slate-500 font-normal mt-0.5">{exp.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-slate-950 text-slate-400 rounded-lg text-[10px] font-bold border border-slate-800/60">
                              {exp.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{exp.date}</td>
                          <td className="p-3 font-extrabold text-indigo-400">{formatCurrency(exp.amount)}</td>
                          <td className="p-3 text-left">
                            <button
                              onClick={() => onDeleteExpense(exp.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                              title="حذف المصروف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PACKAGING TRACKER TAB */}
      {activeTab === 'packaging' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Packaging Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>تسجيل دفعة مالية للمغلّف</span>
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {payError && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">المبلغ المدفوع (د.ج) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="مثال: 5000"
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-700 text-right h-10"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">تاريخ الدفع *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2.5 text-slate-200 text-right h-10"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="مثال: دفعة الأسبوع الحالي لتغليف الطرود..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 text-xs rounded-xl px-3 py-2 text-slate-200 placeholder-slate-700 text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل دفعة مالية</span>
              </button>
            </form>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1.5">
              <p className="font-bold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                كيف يتم الحساب؟
              </p>
              <p>
                يقوم النظام تلقائياً بجمع عدد الكوليات (الطرود) المسجلة في المبيعات، ويضربها في تكلفة التغليف (100 د.ج للطرد) ليحسب التكلفة الكلية، ثم يطرح الدفعات المسجلة لمعرفة الباقي.
              </p>
            </div>
          </div>

          {/* Packaging Stats & Payment History */}
          <div className="lg:col-span-2 space-y-4">
            {/* Packaging Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Stat 1: Total Parcels */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إجمالي الطرود المغلّفة</span>
                </span>
                <p className="text-xl font-black text-white">{totalParcelsPackaged} كولية</p>
                <p className="text-[9px] text-slate-500">حساب تلقائي من المبيعات</p>
              </div>

              {/* Stat 2: Total Cost */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                  <span>تكلفة التغليف الإجمالية</span>
                </span>
                <p className="text-xl font-black text-white">{formatCurrency(totalPackagingCost)}</p>
                <p className="text-[9px] text-slate-500">معدل: 100 د.ج لكل طرد</p>
              </div>

              {/* Stat 3: Remaining Balance */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-orange-400" />
                  <span>مستحقات المغلّف المتبقية</span>
                </span>
                <p className={`text-xl font-black ${remainingPackagingBalance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {formatCurrency(remainingPackagingBalance)}
                </p>
                <p className="text-[9px] text-slate-500">تم دفع: {formatCurrency(totalPackagingPaid)}</p>
              </div>
            </div>

            {/* Payments History Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-200">سجل دفعات المغلّف</h3>
                <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-1 rounded-lg font-bold">
                  العدد: {packagingPayments.length} دفعة
                </span>
              </div>

              {sortedPayments.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-slate-500 text-xs">لا توجد دفعات مالية مسجلة بعد.</p>
                  <p className="text-[10px] text-slate-600">يمكنك تسجيل أول دفعة عند إرسال مبالغ للشخص المكلف بالتغليف.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-bold">
                        <th className="p-3">ملاحظة الدفعة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">المبلغ المدفوع</th>
                        <th className="p-3 text-left">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {sortedPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-800/40 transition-all">
                          <td className="p-3 font-bold text-slate-200">
                            <div>
                              <span>{pay.notes || 'دفعة مالية'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400">{pay.date}</td>
                          <td className="p-3 font-extrabold text-emerald-400">{formatCurrency(pay.amountPaid)}</td>
                          <td className="p-3 text-left">
                            <button
                              onClick={() => onDeletePackagingPayment(pay.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                              title="حذف الدفعة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
