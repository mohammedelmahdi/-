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
}

export type ViewType = 'dashboard' | 'stock' | 'sales';

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ج`;
};

