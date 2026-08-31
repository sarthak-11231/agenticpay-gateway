export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  floorPrice: number;
  stock: number;
  category: string;
  description: string;
}

export interface MerchantPolicy {
  maxDiscountPercentage: number;
  maxOrderValueINR: number;
  requireAgentSignature: boolean;
}

// In-memory catalog state
export let CATALOG: Product[] = [
  {
    id: "prod_001",
    name: "Aura Noise-Cancelling Headphones",
    sku: "HEADPHONES-PRO",
    price: 5999,
    floorPrice: 5199,
    stock: 12,
    category: "Audio",
    description: "Flagship active noise-cancelling wireless headphones with 40h battery life.",
  },
  {
    id: "prod_002",
    name: "Pulse Ultra Smartwatch",
    sku: "SMARTWATCH-V2",
    price: 3499,
    floorPrice: 2999,
    stock: 5,
    category: "Wearables",
    description: "AMOLED health tracker with heart rate, SpO2, and sleep tracking.",
  },
  {
    id: "prod_003",
    name: "Volt 65W GaN Fast Charger",
    sku: "CHARGER-65W",
    price: 1999,
    floorPrice: 1799,
    stock: 25,
    category: "Accessories",
    description: "Compact dual USB-C GaN fast charging adapter.",
  },
];

export let ACTIVE_POLICY: MerchantPolicy = {
  maxDiscountPercentage: 15,
  maxOrderValueINR: 50000,
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