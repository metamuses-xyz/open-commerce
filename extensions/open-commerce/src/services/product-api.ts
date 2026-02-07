/**
 * Product API service for fetching products from Fake Store API.
 * Provides caching to reduce API calls and improve performance.
 */

import type { Product } from "../data/products.js";

const API_BASE = "https://fakestoreapi.com";

// Cache configuration
let cachedProducts: Product[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Response shape from Fake Store API
 */
type FakeStoreProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
};

/**
 * Extract brand from product title.
 * Attempts to find a brand-like word at the beginning of the title.
 */
function extractBrand(title: string): string {
  // Common brand patterns in the Fake Store API data
  const brandPatterns = [
    /^(Fjallraven|SanDisk|WD|Samsung|BIYLACLESEN|John Hardy|Danvouy|DANVOUY|Opna|MBJ)/i,
  ];

  for (const pattern of brandPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback: use first word if it looks like a brand (capitalized)
  const firstWord = title.split(/[\s-]/)[0];
  if (firstWord && firstWord.length > 2 && /^[A-Z]/.test(firstWord)) {
    return firstWord;
  }

  return "Generic";
}

/**
 * Map Fake Store API product to internal Product format.
 */
function mapApiProduct(api: FakeStoreProduct): Product {
  return {
    asin: `FS-${api.id}`, // Fake Store ID as ASIN
    title: api.title,
    price: api.price,
    currency: "USD",
    category: api.category,
    brand: extractBrand(api.title),
    rating: api.rating.rate,
    reviewCount: api.rating.count,
    imageUrl: api.image,
    inStock: true,
    prime: false,
  };
}

/**
 * Fetch all products from Fake Store API with caching.
 */
export async function fetchProducts(): Promise<Product[]> {
  // Return cached data if still valid
  if (cachedProducts && Date.now() - cacheTime < CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: FakeStoreProduct[] = await response.json();
    cachedProducts = data.map(mapApiProduct);
    cacheTime = Date.now();
    return cachedProducts;
  } catch (error) {
    // If we have stale cache, return it on error
    if (cachedProducts) {
      console.warn("Fake Store API error, using stale cache:", error);
      return cachedProducts;
    }
    // Fall back to hardcoded snapshot if no cache available
    console.warn("Fake Store API error with no cache, using fallback data:", error);
    return FALLBACK_PRODUCTS;
  }
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(id: number): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: FakeStoreProduct = await response.json();
    return mapApiProduct(data);
  } catch (error) {
    console.warn("Fake Store API error:", error);
    return null;
  }
}

/**
 * Fetch all product categories.
 */
export async function fetchCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/products/categories`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch products by category.
 */
export async function fetchProductsByCategory(category: string): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/products/category/${encodeURIComponent(category)}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data: FakeStoreProduct[] = await response.json();
  return data.map(mapApiProduct);
}

/**
 * Clear the product cache (for testing).
 */
export function clearProductCache(): void {
  cachedProducts = null;
  cacheTime = 0;
}

/**
 * Fallback product data — snapshot of Fake Store API products.
 * Used when the API is unreachable and no cache is available.
 */
const FALLBACK_PRODUCTS: Product[] = [
  {
    asin: "FS-1",
    title: "Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",
    price: 109.95,
    currency: "USD",
    category: "men's clothing",
    brand: "Fjallraven",
    rating: 3.9,
    reviewCount: 120,
    imageUrl: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-2",
    title: "Mens Casual Premium Slim Fit T-Shirts",
    price: 22.3,
    currency: "USD",
    category: "men's clothing",
    brand: "Generic",
    rating: 4.1,
    reviewCount: 259,
    imageUrl: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-3",
    title: "Mens Cotton Jacket",
    price: 55.99,
    currency: "USD",
    category: "men's clothing",
    brand: "Generic",
    rating: 4.7,
    reviewCount: 500,
    imageUrl: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-4",
    title: "Mens Casual Slim Fit",
    price: 15.99,
    currency: "USD",
    category: "men's clothing",
    brand: "Generic",
    rating: 2.1,
    reviewCount: 430,
    imageUrl: "https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-5",
    title: "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
    price: 695,
    currency: "USD",
    category: "jewelery",
    brand: "John Hardy",
    rating: 4.6,
    reviewCount: 400,
    imageUrl: "https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-6",
    title: "Solid Gold Petite Micropave",
    price: 168,
    currency: "USD",
    category: "jewelery",
    brand: "Solid",
    rating: 3.9,
    reviewCount: 70,
    imageUrl: "https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-7",
    title: "White Gold Plated Princess",
    price: 9.99,
    currency: "USD",
    category: "jewelery",
    brand: "White",
    rating: 3,
    reviewCount: 400,
    imageUrl: "https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-8",
    title: "Pierced Owl Rose Gold Plated Stainless Steel Double",
    price: 10.99,
    currency: "USD",
    category: "jewelery",
    brand: "Pierced",
    rating: 1.9,
    reviewCount: 100,
    imageUrl: "https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-9",
    title: "WD 2TB Elements Portable External Hard Drive - USB 3.0",
    price: 64,
    currency: "USD",
    category: "electronics",
    brand: "WD",
    rating: 3.3,
    reviewCount: 203,
    imageUrl: "https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-10",
    title: "SanDisk SSD PLUS 1TB Internal SSD - SATA III 6 Gb/s",
    price: 109,
    currency: "USD",
    category: "electronics",
    brand: "SanDisk",
    rating: 2.9,
    reviewCount: 470,
    imageUrl: "https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-11",
    title: "Silicon Power 256GB SSD 3D NAND A55 SLC Cache Performance Boost SATA III 2.5",
    price: 109,
    currency: "USD",
    category: "electronics",
    brand: "Silicon",
    rating: 4.8,
    reviewCount: 319,
    imageUrl: "https://fakestoreapi.com/img/71kWymZ+c+L._AC_SX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-12",
    title: "WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive",
    price: 114,
    currency: "USD",
    category: "electronics",
    brand: "WD",
    rating: 4.8,
    reviewCount: 400,
    imageUrl: "https://fakestoreapi.com/img/61mtL65D4cL._AC_SX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-13",
    title: "Acer SB220Q bi 21.5 inches Full HD (1920 x 1080) IPS Ultra-Thin",
    price: 599,
    currency: "USD",
    category: "electronics",
    brand: "Acer",
    rating: 2.9,
    reviewCount: 250,
    imageUrl: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-14",
    title: "Samsung 49-Inch CHG90 144Hz Curved Gaming Monitor",
    price: 999.99,
    currency: "USD",
    category: "electronics",
    brand: "Samsung",
    rating: 2.2,
    reviewCount: 140,
    imageUrl: "https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-15",
    title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coats",
    price: 56.99,
    currency: "USD",
    category: "women's clothing",
    brand: "BIYLACLESEN",
    rating: 2.6,
    reviewCount: 235,
    imageUrl: "https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-16",
    title: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
    price: 29.95,
    currency: "USD",
    category: "women's clothing",
    brand: "Lock",
    rating: 2.9,
    reviewCount: 340,
    imageUrl: "https://fakestoreapi.com/img/81XH0e8fefL._AC_UY879_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-17",
    title: "Rain Jacket Women Windbreaker Striped Climbing Raincoats",
    price: 39.99,
    currency: "USD",
    category: "women's clothing",
    brand: "Rain",
    rating: 3.8,
    reviewCount: 679,
    imageUrl: "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-18",
    title: "MBJ Women's Solid Short Sleeve Boat Neck V",
    price: 9.85,
    currency: "USD",
    category: "women's clothing",
    brand: "MBJ",
    rating: 4.7,
    reviewCount: 130,
    imageUrl: "https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-19",
    title: "Opna Women's Short Sleeve Moisture",
    price: 7.95,
    currency: "USD",
    category: "women's clothing",
    brand: "Opna",
    rating: 4.5,
    reviewCount: 146,
    imageUrl: "https://fakestoreapi.com/img/51eg55uWmdL._AC_UX679_t.png",
    inStock: true,
    prime: false,
  },
  {
    asin: "FS-20",
    title: "DANVOUY Womens T Shirt Casual Cotton Short",
    price: 12.99,
    currency: "USD",
    category: "women's clothing",
    brand: "DANVOUY",
    rating: 3.6,
    reviewCount: 145,
    imageUrl: "https://fakestoreapi.com/img/61pHAEJ4NML._AC_UX679_t.png",
    inStock: true,
    prime: false,
  },
];
