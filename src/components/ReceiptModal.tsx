import { useState } from 'react';
import { Sale, formatCurrency } from '../types';
import { X, Printer, Check, Copy, Share2 } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export default function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  // Calculate pricing breakdown
  const totalTTC = sale.totalPrice;
  const tvaRate = 0.19; // 19% Algerian standard VAT
  // totalTTC = totalHT * (1 + tvaRate) => totalHT = totalTTC / 1.19
  const totalHT = totalTTC / (1 + tvaRate);
  const totalTVA = totalTTC - totalHT;

  // Handle printing simulator
  const handlePrint = () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => {
        setPrintSuccess(false);
      }, 3000);
    }, 1500);
  };

  // Handle copying receipt reference
  const handleCopy = () => {
    navigator.clipboard.writeText(`RECU-${sale.id.toUpperCase()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400">إيصال المبيعات</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container Body */}
        <div className="p-5 overflow-y-auto bg-slate-950/40 flex-1 flex flex-col items-center">
          
          {/* Paper roll style card */}
          <div className="w-full bg-white text-slate-900 p-6 rounded-2xl shadow-inner border border-slate-100 font-mono text-xs space-y-4 relative overflow-hidden text-right">
            
            {/* Top jagged cut visual indicator */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#f8fafc_33.333%,#f8fafc_66.667%,transparent_66.667%)] bg-[length:12px_6px]"></div>

            {/* Store Information */}
            <div className="text-center space-y-1 pt-2">
              <h4 className="text-sm font-bold tracking-wider uppercase">مؤسسة جيستوك ذ.م.م</h4>
              <p className="text-[10px] text-slate-500">شارع 1 نوفمبر، الجزائر العاصمة</p>
              <p className="text-[10px] text-slate-500">الهاتف: 021.40.20.30 • س.ت: 16/00-1234567</p>
              <p className="text-[10px] text-slate-500">الرقم الضريبي: 12345678900012</p>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-slate-300 my-3"></div>

            {/* Meta Data */}
            <div className="space-y-1 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>التاريخ:</span>
                <span>{new Date(sale.date).toLocaleDateString('ar-DZ')} {new Date(sale.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>معرف البيع:</span>
                <span className="font-bold">{sale.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>البائع:</span>
                <span>محمد إ.</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-slate-300 my-3"></div>

            {/* Header of items */}
            <div className="grid grid-cols-12 font-bold text-slate-800 pb-1.5 border-b border-slate-200">
              <span className="col-span-6 text-right">البيان / المنتج</span>
              <span className="col-span-2 text-center">الكمية</span>
              <span className="col-span-4 text-left">المبلغ</span>
            </div>

             {/* Item list */}
            <div className="space-y-3 pt-1.5">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx) => {
                  const qtyLabel = item.sellType === 'carton' 
                    ? `${item.cartonsQuantity || Math.round(item.quantity / (item.pairsQuantity || 12))} كرتون`
                    : `${item.pairsQuantity || item.quantity} زوج`;
                  
                  return (
                    <div key={idx} className="border-b border-slate-100 last:border-b-0 pb-1.5 last:pb-0">
                      <div className="grid grid-cols-12 text-slate-800 leading-tight">
                        <span className="col-span-6 font-semibold line-clamp-2 text-[11px] text-right">{item.productName}</span>
                        <span className="col-span-3 text-center text-slate-600">{qtyLabel}</span>
                        <span className="col-span-3 text-left font-bold">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 italic text-right mt-0.5">سعر الوحدة: {formatCurrency(item.sellingPriceAtSale)}</p>
                    </div>
                  );
                })
              ) : (
                <div>
                  <div className="grid grid-cols-12 text-slate-800 leading-tight">
                    <span className="col-span-6 font-semibold line-clamp-2 text-[11px] text-right">{sale.productName}</span>
                    <span className="col-span-3 text-center text-slate-600">{sale.quantity} زوج</span>
                    <span className="col-span-3 text-left font-bold">
                      {formatCurrency(sale.totalPrice)}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic text-right mt-0.5">سعر الوحدة: {formatCurrency(sale.sellingPriceAtSale)} (شامل الرسوم)</p>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-slate-300 my-4"></div>

            {/* Financial Summary Breakdown */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>المجموع دون الرسوم (HT)</span>
                <span>{formatCurrency(totalHT)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الضريبة على القيمة المضافة 19%</span>
                <span>{formatCurrency(totalTVA)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>الإجمالي شامل الضريبة (TTC)</span>
                <span>{formatCurrency(totalTTC)}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-slate-300 my-4"></div>

            {/* Tax grid breakdown */}
            <div className="text-[9px] text-slate-500 space-y-0.5">
              <div className="grid grid-cols-12 font-bold text-slate-600">
                <span className="col-span-4 text-right">معدل الضريبة</span>
                <span className="col-span-4 text-center">الأساس الصافي</span>
                <span className="col-span-4 text-left">مبلغ الضريبة</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-right">19.00% (أ)</span>
                <span className="col-span-4 text-center">{formatCurrency(totalHT)}</span>
                <span className="col-span-4 text-left">{formatCurrency(totalTVA)}</span>
              </div>
            </div>

            {/* Footer message */}
            <div className="text-center pt-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-700">شكراً لثقتكم بنا وبزيارتكم!</p>
              <p className="text-[8px] text-slate-400">يرجى الاحتفاظ بهذا الوصل لأي استبدال خلال 14 يوماً.</p>
              <div className="flex justify-center pt-2">
                {/* Simulated Barcode */}
                <div className="h-6 w-3/4 bg-slate-900 flex justify-around p-1 rounded-sm">
                  {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-white h-full" 
                      style={{ width: `${Math.random() > 0.4 ? '1px' : '3px'}` }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[8px] font-mono text-slate-400 mt-1">*{sale.id.slice(0, 8).toUpperCase()}*</p>
            </div>
            
            {/* Bottom jagged cut visual indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#f8fafc_33.333%,#f8fafc_66.667%,transparent_66.667%)] bg-[length:12px_6px] rotate-180"></div>

          </div>

          {/* Quick Actions Panel */}
          {printSuccess && (
            <div className="w-full bg-emerald-500/15 border border-emerald-500/30 rounded-xl py-2 px-3 text-center text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-2 animate-bounce mt-4">
              <Check className="w-4.5 h-4.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 shrink-0" />
              <span>تمت الطباعة! أُرسل الإيصال بنجاح إلى الطابعة الحرارية.</span>
            </div>
          )}

          <div className="w-full grid grid-cols-3 gap-2 mt-4 text-xs">
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl border border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ' : 'نسخ المعرف'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="col-span-2 flex items-center justify-center gap-2 bg-gradient-to-tr from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-spin' : ''}`} />
              <span>{isPrinting ? 'جاري الطباعة...' : 'طباعة الوصل'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500">© 2026 جيستوك - جميع الحقوق محفوظة</p>
        </div>

      </div>
    </div>
  );
}
