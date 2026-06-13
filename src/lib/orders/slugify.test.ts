import { describe, expect, it } from 'vitest';
import { slugifyOrderText } from './slugify';

describe('slugifyOrderText', () => {
  it('normalizes accents and spaces', () => {
    expect(slugifyOrderText('Café du Port')).toBe('cafe-du-port');
  });

  it('returns fallback for empty slug', () => {
    expect(slugifyOrderText('---')).toBe('commande');
  });
});
