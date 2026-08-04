/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number; // Total pairs available (cartonsCount * pairsPerCarton)
  buyingPrice: number; // Single pair buying price
  sellingPrice: number; // Single pair selling price
  
  // Wholesale shoes specific fields
  cartonsCount?: number; // عدد الكراتين بالمخزن
  pairsPerCarton?: number; // عدد الأحذية (الأزواج) في الكرتون الواحد
  singlePairBuyingPrice?: number; // سعر شراء الحذاء الواحد
  singlePairSellingPrice?: number; // سعر بيع الحذاء الواحد
  buyingPricePerCarton?: number; // سعر شراء الكرتون تلقائي (pairsPerCarton * singlePairBuyingPrice)
  sellingPricePerCarton?: number; // سعر بيع الكرتون تلقائي (pairsPerCarton * singlePairSellingPrice)
  imageUrl?: string; // صورة الحذاء
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number; // Total pairs sold
  buyingPriceAtSale: number; // Price per unit (either pair or carton average unit)
  sellingPriceAtSale: number;
  totalPrice: number;
  
  // Wholesale details
  sellType: 'carton' | 'pair'; // نوع البيع: كرتون أو بالزوج
  cartonsQuantity: number; // عدد الكراتين المباعة
  pairsQuantity: number; // عدد الأزواج المباعة فردياً
  sku?: string;
  imageUrl?: string;
}

export type SaleStatus = 'pending' | 'shipped' | 'delivered' | 'returned' | 'returned_to_supplier';

export interface Sale {
  id: string;
  date: string; // ISO string
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  buyingPriceAtSale: number;
  sellingPriceAtSale: number;
  items?: SaleItem[];
  customerName?: string;
  customerPhone?: string;
  customerState?: string;
  customerMunicipality?: string;
  customerColis?: number;
  status?: SaleStatus;
}

export interface Expense {
  id: string;
  title: string;       // عنوان المصروف
  amount: number;      // المبلغ بالدينار
  date: string;        // تاريخ المصروف (ISO)
  category: string;    // فئة المصروف
  notes?: string;      // ملاحظات إضافية
}

export interface PackagingPayment {
  id: string;
  date: string;        // تاريخ الدفع (ISO)
  amountPaid: number;  // المبلغ المدفوع بالدينار
  notes?: string;      // ملاحظات إضافية
}

export type ViewType = 'dashboard' | 'stock' | 'sales' | 'expenses' | 'stats';

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} د.ج`;
};

