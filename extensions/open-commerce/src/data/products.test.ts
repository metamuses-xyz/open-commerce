import { afterEach, describe, expect, it, vi } from "vitest";
import { searchProducts, getProductByAsin, getAllProducts } from "./products.js";

// Mock the product-api module
vi.mock("../services/product-api.js", () => ({
  fetchProducts: vi.fn().mockResolvedValue([
    {
      asin: "FS-1",
      title: "Fjallraven Backpack Fits 15 Laptops",
      price: 109.95,
      currency: "USD",
      category: "men's clothing",
      brand: "Fjallraven",
      rating: 3.9,
      reviewCount: 120,
      imageUrl: "https://example.com/img1.png",
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
      imageUrl: "https://example.com/img9.png",
      inStock: true,
      prime: false,
    },
    {
      asin: "FS-10",
      title: "SanDisk SSD PLUS 1TB Internal SSD",
      price: 109,
      currency: "USD",
      category: "electronics",
      brand: "SanDisk",
      rating: 2.9,
      reviewCount: 470,
      imageUrl: "https://example.com/img10.png",
      inStock: true,
      prime: false,
    },
    {
      asin: "FS-99",
      title: "Out of Stock Widget",
      price: 5,
      currency: "USD",
      category: "electronics",
      brand: "Generic",
      rating: 5,
      reviewCount: 1000,
      imageUrl: "https://example.com/img99.png",
      inStock: false,
      prime: false,
    },
  ]),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchProducts", () => {
  it("returns products matching the query", async () => {
    const results = await searchProducts("backpack");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].asin).toBe("FS-1");
  });

  it("gives title matches higher scores", async () => {
    const results = await searchProducts("SSD");
    expect(results.length).toBeGreaterThan(0);
    // SSD appears in title, so it should match
    expect(results[0].title).toContain("SSD");
  });

  it("respects maxResults parameter", async () => {
    const results = await searchProducts("drive", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array for no matches", async () => {
    const results = await searchProducts("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("excludes out-of-stock products", async () => {
    const results = await searchProducts("widget");
    expect(results).toEqual([]);
  });

  it("handles multi-word queries", async () => {
    const results = await searchProducts("hard drive");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("getProductByAsin", () => {
  it("returns product by ASIN", async () => {
    const product = await getProductByAsin("FS-1");
    expect(product).toBeDefined();
    expect(product!.asin).toBe("FS-1");
  });

  it("returns undefined for unknown ASIN", async () => {
    const product = await getProductByAsin("FS-999");
    expect(product).toBeUndefined();
  });
});

describe("getAllProducts", () => {
  it("returns all products including out-of-stock", async () => {
    const products = await getAllProducts();
    expect(products.length).toBe(4);
  });
});
