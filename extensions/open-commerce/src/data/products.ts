/**
 * Mock product catalog with realistic Amazon-style products.
 * Used for demo purposes without requiring Amazon API access.
 */

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

export const PRODUCTS: Product[] = [
  // USB Cables & Chargers
  {
    asin: "B08T5QN6S3",
    title: "Anker USB-C to USB-C Cable (6ft, 2-Pack), 100W Fast Charging",
    price: 15.99,
    currency: "USD",
    category: "Electronics",
    brand: "Anker",
    rating: 4.7,
    reviewCount: 89234,
    imageUrl: "https://m.media-amazon.com/images/I/61m0kRHx+wL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B07PGL2ZSL",
    title: "Amazon Basics USB-C to Lightning Cable (6ft) MFi Certified",
    price: 8.99,
    currency: "USD",
    category: "Electronics",
    brand: "Amazon Basics",
    rating: 4.5,
    reviewCount: 156789,
    imageUrl: "https://m.media-amazon.com/images/I/61bO7TQKPML._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B0BWGF3X8N",
    title: "Anker 735 Charger (65W) 3-Port USB-C Wall Charger",
    price: 39.99,
    currency: "USD",
    category: "Electronics",
    brand: "Anker",
    rating: 4.6,
    reviewCount: 23456,
    imageUrl: "https://m.media-amazon.com/images/I/61Qe0euJJZL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Wireless Earbuds
  {
    asin: "B0BDHB9Y8H",
    title: "Apple AirPods Pro (2nd Generation) Wireless Earbuds",
    price: 199.99,
    currency: "USD",
    category: "Electronics",
    brand: "Apple",
    rating: 4.7,
    reviewCount: 78234,
    imageUrl: "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B0C33XXS56",
    title: "Samsung Galaxy Buds2 Pro True Wireless Bluetooth Earbuds",
    price: 149.99,
    currency: "USD",
    category: "Electronics",
    brand: "Samsung",
    rating: 4.4,
    reviewCount: 34567,
    imageUrl: "https://m.media-amazon.com/images/I/51YpOT1QwjL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B09JQZ8DC5",
    title: "Anker Soundcore Liberty 4 NC Wireless Earbuds - Active Noise Cancelling",
    price: 79.99,
    currency: "USD",
    category: "Electronics",
    brand: "Soundcore",
    rating: 4.3,
    reviewCount: 12345,
    imageUrl: "https://m.media-amazon.com/images/I/61djRjNe4-L._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Phone Accessories
  {
    asin: "B0BX1R8VB5",
    title: "Spigen Ultra Hybrid Case for iPhone 15 Pro Max - Crystal Clear",
    price: 17.99,
    currency: "USD",
    category: "Cell Phone Accessories",
    brand: "Spigen",
    rating: 4.6,
    reviewCount: 45678,
    imageUrl: "https://m.media-amazon.com/images/I/71GLMJ7TQiL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B0B9R3TQ93",
    title: "PopSockets Phone Grip with Expanding Kickstand",
    price: 9.99,
    currency: "USD",
    category: "Cell Phone Accessories",
    brand: "PopSockets",
    rating: 4.7,
    reviewCount: 234567,
    imageUrl: "https://m.media-amazon.com/images/I/61mlhjWGl4L._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Computer Accessories
  {
    asin: "B09HM94VTC",
    title: "Logitech MX Master 3S Wireless Mouse - Graphite",
    price: 99.99,
    currency: "USD",
    category: "Computer Accessories",
    brand: "Logitech",
    rating: 4.8,
    reviewCount: 67890,
    imageUrl: "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B09J72XKLP",
    title: "Logitech MX Keys Mini Wireless Keyboard - Pale Gray",
    price: 79.99,
    currency: "USD",
    category: "Computer Accessories",
    brand: "Logitech",
    rating: 4.7,
    reviewCount: 23456,
    imageUrl: "https://m.media-amazon.com/images/I/71gOLg2-kqL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B0C7THQZ8P",
    title: "SanDisk 1TB Extreme Portable SSD - External Drive USB-C",
    price: 89.99,
    currency: "USD",
    category: "Computer Accessories",
    brand: "SanDisk",
    rating: 4.7,
    reviewCount: 98765,
    imageUrl: "https://m.media-amazon.com/images/I/71xZTBGkSqL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Smart Home
  {
    asin: "B0BFXR5V3Q",
    title: "Echo Dot (5th Gen) Smart Speaker with Alexa - Charcoal",
    price: 49.99,
    currency: "USD",
    category: "Smart Home",
    brand: "Amazon",
    rating: 4.6,
    reviewCount: 345678,
    imageUrl: "https://m.media-amazon.com/images/I/71xoR4A6q-L._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B0B9RK8Z76",
    title: "Ring Video Doorbell 4 - HD Video with Two-Way Talk",
    price: 199.99,
    currency: "USD",
    category: "Smart Home",
    brand: "Ring",
    rating: 4.5,
    reviewCount: 56789,
    imageUrl: "https://m.media-amazon.com/images/I/51VfZL8T8CL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B08F6GPQQ7",
    title: "Philips Hue White and Color Ambiance A19 Starter Kit (4 Bulbs)",
    price: 179.99,
    currency: "USD",
    category: "Smart Home",
    brand: "Philips Hue",
    rating: 4.6,
    reviewCount: 34567,
    imageUrl: "https://m.media-amazon.com/images/I/61Wt0AhINvL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Portable Electronics
  {
    asin: "B0BT5CY2PG",
    title: "Anker 737 Power Bank (PowerCore 24K) - 140W Portable Charger",
    price: 109.99,
    currency: "USD",
    category: "Electronics",
    brand: "Anker",
    rating: 4.6,
    reviewCount: 12345,
    imageUrl: "https://m.media-amazon.com/images/I/615h8g9KXNL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B09V3KXJPB",
    title: "Kindle Paperwhite (16 GB) - Agave Green",
    price: 139.99,
    currency: "USD",
    category: "Electronics",
    brand: "Amazon",
    rating: 4.7,
    reviewCount: 123456,
    imageUrl: "https://m.media-amazon.com/images/I/61R1JuPRsmL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },

  // Office Supplies
  {
    asin: "B01M0K4B66",
    title: "AmazonBasics Letter Size Sheet Protectors (100 Pack)",
    price: 11.49,
    currency: "USD",
    category: "Office Products",
    brand: "Amazon Basics",
    rating: 4.7,
    reviewCount: 87654,
    imageUrl: "https://m.media-amazon.com/images/I/81wjMWbU3xL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
  {
    asin: "B00006IE8I",
    title: "Post-it Super Sticky Notes, 3x3 in, 12 Pads, Assorted Colors",
    price: 18.99,
    currency: "USD",
    category: "Office Products",
    brand: "Post-it",
    rating: 4.8,
    reviewCount: 234567,
    imageUrl: "https://m.media-amazon.com/images/I/81p0p8aJ2LL._AC_SX679_.jpg",
    inStock: true,
    prime: true,
  },
];

/**
 * Search products by query string.
 * Matches against title, brand, and category.
 */
export function searchProducts(query: string, maxResults = 5): Product[] {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/);

  // Score products based on query match
  const scored = PRODUCTS.filter((p) => p.inStock).map((product) => {
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
    .toSorted((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.product);
}

/**
 * Get product by ASIN.
 */
export function getProductByAsin(asin: string): Product | undefined {
  return PRODUCTS.find((p) => p.asin === asin);
}
