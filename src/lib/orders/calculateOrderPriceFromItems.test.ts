import { describe, expect, it } from 'vitest';
import {
  calculateOrderPriceFromItems,
  normalizeItemPrice,
} from './calculateOrderPriceFromItems';

describe('calculateOrderPriceFromItems', () => {
  it('sums priced lines', () => {
    expect(
      calculateOrderPriceFromItems([
        { quantity: 2, price: 10 },
        { quantity: 1, price: 5 },
      ]),
    ).toBe(25);
  });

  it('returns null when total is zero', () => {
    expect(
      calculateOrderPriceFromItems([{ quantity: 1, price: null }]),
    ).toBeNull();
  });
});

describe('normalizeItemPrice', () => {
  it('parses decimal strings', () => {
    expect(normalizeItemPrice('12.5')).toBe(12.5);
  });
});
