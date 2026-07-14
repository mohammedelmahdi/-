import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Sale } from '../types';

// Lazy initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign-in
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Create a new Spreadsheet database for shoe inventory & sales
export const createDatabaseSpreadsheet = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: 'جيستوك للأحذية - قاعدة البيانات (Gestock Shoes DB)'
        },
        sheets: [
          { properties: { title: 'المخزون (Products)' } },
          { properties: { title: 'المبيعات (Sales)' } }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create spreadsheet: ${response.statusText}`);
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // Initialize headers
    await initializeSheetHeaders(accessToken, spreadsheetId);

    return spreadsheetId;
  } catch (err) {
    console.error('Spreadsheet creation error:', err);
    throw err;
  }
};

const initializeSheetHeaders = async (accessToken: string, spreadsheetId: string) => {
  // Write headers for Products
  const productsHeaders = [
    ['ID', 'SKU', 'الاسم (Name)', 'التصنيف (Category)', 'الكمية الكلية بالأزواج (Total Pairs)', 'عدد الكراتين (Cartons Count)', 'عدد الأزواج في الكرتون (Pairs per Carton)', 'سعر الشراء للزوج (Pair Buying Price)', 'سعر البيع للزوج (Pair Selling Price)', 'سعر شراء الكرتون (Carton Buying Price)', 'سعر بيع الكرتون (Carton Selling Price)', 'رابط الصورة (Image URL)', 'تاريخ التحديث (Updated At)']
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المخزون (Products)'!A1:M1")}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: productsHeaders })
  });

  // Write headers for Sales
  const salesHeaders = [
    ['معرف البيع (Sale ID)', 'التاريخ (Date)', 'اسم الموديل (Model Name)', 'الكمية الكلية بالأزواج (Total Pairs Sold)', 'المبلغ الإجمالي (Total Paid)', 'نوع البيع (Sell Type)', 'الكراتين المباعة (Cartons Quantity)', 'الأزواج المباعة (Pairs Quantity)', 'المنتجات الفرعية (Sub Items)', 'اسم الزبون (Customer Name)', 'رقم الهاتف (Phone)', 'الولاية (State/Wilaya)', 'البلدية (Municipality/Baladiya)']
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المبيعات (Sales)'!A1:M1")}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: salesHeaders })
  });
};

// Sync Products to Google Sheet
export const syncProductsToSheet = async (accessToken: string, spreadsheetId: string, products: Product[]) => {
  const values = products.map(p => {
    const cartons = p.cartonsCount !== undefined ? p.cartonsCount : Math.floor(p.quantity / (p.pairsPerCarton || 12));
    const pairsPerCtn = p.pairsPerCarton || 12;
    const singleBuy = p.singlePairBuyingPrice || p.buyingPrice;
    const singleSell = p.singlePairSellingPrice || p.sellingPrice;
    const ctnBuy = p.buyingPricePerCarton || (singleBuy * pairsPerCtn);
    const ctnSell = p.sellingPricePerCarton || (singleSell * pairsPerCtn);

    return [
      p.id,
      p.sku,
      p.name,
      p.category,
      p.quantity,
      cartons,
      pairsPerCtn,
      singleBuy,
      singleSell,
      ctnBuy,
      ctnSell,
      p.imageUrl || '',
      new Date().toISOString()
    ];
  });

  // Overwrite rows starting from row 2
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المخزون (Products)'!A2:M1000")}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (values.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المخزون (Products)'!A2:M" + (1 + values.length))}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });
  }
};

// Sync Sales to Google Sheet
export const syncSalesToSheet = async (accessToken: string, spreadsheetId: string, sales: Sale[]) => {
  const values = sales.map(s => {
    const itemsDetails = s.items && s.items.length > 0 
      ? s.items.map(item => `${item.productName} (${item.sellType === 'carton' ? `${item.cartonsQuantity} كرتون` : `${item.pairsQuantity} زوج`})`).join(' | ')
      : '';

    const sellType = s.items && s.items.length > 0 ? s.items[0].sellType : 'pair';
    const cartonsQty = s.items && s.items.length > 0 ? s.items.reduce((sum, item) => sum + (item.cartonsQuantity || 0), 0) : 0;
    const pairsQty = s.items && s.items.length > 0 ? s.items.reduce((sum, item) => sum + (item.pairsQuantity || 0), 0) : s.quantity;

    return [
      s.id,
      s.date,
      s.productName,
      s.quantity,
      s.totalPrice,
      sellType === 'carton' ? 'جملة (بالكرتون)' : 'تجزئة (بالزوج)',
      cartonsQty,
      pairsQty,
      itemsDetails,
      s.customerName || '',
      s.customerPhone || '',
      s.customerState || '',
      s.customerMunicipality || ''
    ];
  });

  // Clear previous values first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المبيعات (Sales)'!A2:M2000")}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (values.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'المبيعات (Sales)'!A2:M" + (1 + values.length))}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });
  }
};
