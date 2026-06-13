import { describe, expect, it } from 'vitest';
import { calculateOrderWeightFromItems } from './calculateOrderWeightFromItems';

describe('calculateOrderWeightFromItems', () => {
  it('sums weighted lines', () => {
    expect(
      calculateOrderWeightFromItems([
        { quantity: 2, weight: 1.5 },
        { quantity: 1, weight: 2 },
      ]),
    ).toBe(5);
  });

  it('returns null when total is zero', () => {
    expect(
      calculateOrderWeightFromItems([{ quantity: 1, weight: null }]),
    ).toBeNull();
  });
});
