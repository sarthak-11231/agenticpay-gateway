export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  floorPrice: number;
  stock: number;
  category: string;
  description: string;
  crossSellSku?: string;
  crossSellPitch?: string;
}

export interface MerchantPolicy {
  maxDiscountPercentage: number;
  maxOrderValueINR: number;
  requireAgentSignature: boolean;
}

export const DEFAULT_CATALOG: Product[] = [
  {
    id: "prod_001",
    name: "Apple AirPods Pro (2nd Gen, USB-C)",
    sku: "APPLE-APP2-USBC",
    price: 24900,
    floorPrice: 21999,
    stock: 8,
    category: "Audio",
    description: "Flagship active noise cancellation with USB-C MagSafe charging case and H2 chip.",
    crossSellSku: "ANKER-PRIME-67W",
    crossSellPitch: "Bundle an Anker Prime 67W GaN 3-Port Fast Charger for just ₹3,199 (Save 20%) to fast charge your AirPods & phone together.",
  },
  {
    id: "prod_002",
    name: "Sony WH-1000XM5 Wireless Headphones",
    sku: "SONY-WH1000XM5-BLK",
    price: 29990,
    floorPrice: 26490,
    stock: 6,
    category: "Audio",
    description: "Industry-leading noise canceling overhead headphones with 30-hour battery life.",
    crossSellSku: "ANKER-PRIME-67W",
    crossSellPitch: "Add an Anker Prime 67W Fast Charger for ₹3,199 to unlock 3-minute quick charging (3 hours playback).",
  },
  {
    id: "prod_003",
    name: "Samsung Galaxy Watch 6 (44mm Bluetooth)",
    sku: "SAMS-GW6-44BT",
    price: 19999,
    floorPrice: 17499,
    stock: 5,
    category: "Wearables",
    description: "Super AMOLED sapphire crystal display with advanced sleep coaching and ECG tracking.",
    crossSellSku: "ANKER-PRIME-67W",
    crossSellPitch: "Bundle a high-speed GaN charging dock for ₹3,199 to ensure uninterrupted overnight health monitoring.",
  },
  {
    id: "prod_004",
    name: "Keychron K2 Pro Wireless Mechanical Keyboard",
    sku: "KEYCH-K2PRO-RED",
    price: 8999,
    floorPrice: 7999,
    stock: 14,
    category: "Peripherals",
    description: "QMK/VIA wireless custom mechanical keyboard with hot-swappable switches and RGB.",
    crossSellSku: "ANKER-PRIME-67W",
    crossSellPitch: "Add an Anker Prime GaN charger for ₹3,199 to power your entire desk setup cleanly.",
  },
  {
    id: "prod_005",
    name: "Anker Prime 67W GaN Wall Charger (3-Port)",
    sku: "ANKER-PRIME-67W",
    price: 3999,
    floorPrice: 3499,
    stock: 20,
    category: "Accessories",
    description: "Ultra-compact 3-port fast charger with dual USB-C PowerIQ 4.0 ports.",
  },
];

export let CATALOG: Product[] = JSON.parse(JSON.stringify(DEFAULT_CATALOG));

export let ACTIVE_POLICY: MerchantPolicy = {
  maxDiscountPercentage: 15,
  maxOrderValueINR: 100000,
  requireAgentSignature: true,
};

export function updatePolicy(newPolicy: Partial<MerchantPolicy>) {
  ACTIVE_POLICY = { ...ACTIVE_POLICY, ...newPolicy };
  return ACTIVE_POLICY;
}

export function deductStock(productId: string, quantity: number) {
  const item = CATALOG.find((p) => p.id === productId || p.sku === productId);
  if (item && item.stock >= quantity) {
    item.stock -= quantity;
    return true;
  }
  return false;
}

export function resetInventory(): Product[] {
  CATALOG = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
  return CATALOG;
}

export function getCatalog(): Product[] {
  return CATALOG;
}