import type { CSSProperties } from 'react';

/** Mantine 10-shade palette */
export type ApothecaryPalette = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

/**
 * Soft label style: cream tint background, readable ink-like text, subtle border.
 * Works with Badge variant="outline" (ignores Mantine filled/light fills).
 */
export function apothecaryPillStyle(palette: ApothecaryPalette): CSSProperties {
  return {
    backgroundColor: palette[1],
    color: palette[8],
    border: `1px solid ${palette[3]}`,
  };
}
