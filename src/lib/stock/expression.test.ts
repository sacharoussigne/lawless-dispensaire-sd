import { describe, expect, it } from 'vitest';
import { evaluateDecimalExpression, evaluateIntegerExpression, formatTruncated, truncateToDecimals } from './expression';

describe('expression', () => {
  it('evaluates integer expressions with rounding', () => {
    expect(evaluateIntegerExpression('1+1')).toBe(2);
    expect(evaluateIntegerExpression('1.2 + 1.2')).toBe(2);
  });

  it('evaluates decimal expressions without rounding', () => {
    expect(evaluateDecimalExpression('59.8-3')).toBeCloseTo(56.8);
  });

  it('rejects invalid expressions', () => {
    expect(evaluateDecimalExpression('alert(1)')).toBe('');
    expect(evaluateIntegerExpression('')).toBe('');
  });

  it('truncates without rounding', () => {
    expect(truncateToDecimals(1.239, 2)).toBe(1.23);
    expect(truncateToDecimals(-1.239, 2)).toBe(-1.23);
  });

  it('formats with 1-2 decimals without rounding', () => {
    expect(formatTruncated(12, 1, 2)).toBe('12.0');
    expect(formatTruncated(12.34, 1, 2)).toBe('12.34');
    expect(formatTruncated(12.3, 1, 2)).toBe('12.3');
    expect(formatTruncated(12.399, 1, 2)).toBe('12.39');
  });
});

