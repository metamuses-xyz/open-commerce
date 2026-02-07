/**
 * Product catalog using Fake Store API.
 * Provides search and lookup functions with caching.
 */

import { fetchProducts } from "../services/product-api.js";

export type Product = {
  asin: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  inStock: boolean;
  prime: boolean;
};

/**
 * Search products by query string.
 * Matches against title, brand, and category.
 */
export async function searchProducts(query: string, maxResults = 5): Promise<Product[]> {
  const products = await fetchProducts();

  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/);

  // Score products based on query match
  const scored = products
    .filter((p) => p.inStock)
    .map((product) => {
      const searchText = `${product.title} ${product.brand} ${product.category}`.toLowerCase();
      let score = 0;

      for (const word of queryWords) {
        if (searchText.includes(word)) {
          score += 1;
          // Bonus for title match
          if (product.title.toLowerCase().includes(word)) {
            score += 2;
          }
          // Bonus for brand match
          if (product.brand.toLowerCase().includes(word)) {
            score += 1;
          }
        }
      }

      return { product, score };
    });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.product);
}

/**
 * Get product by ASIN.
 */
export async function getProductByAsin(asin: string): Promise<Product | undefined> {
  const products = await fetchProducts();
  return products.find((p) => p.asin === asin);
}

/**
 * Get all products.
 */
export async function getAllProducts(): Promise<Product[]> {
  return fetchProducts();
}
