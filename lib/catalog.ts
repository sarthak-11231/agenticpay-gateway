export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;       // Base price in INR
  floorPrice: number;  // Hard minimum boundary
  stock: number;
  category: string;
  description: string;
}

export const CATALOG: Product[] = [
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