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
    throw error;
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
