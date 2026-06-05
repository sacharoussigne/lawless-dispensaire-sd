import type { CSSProperties } from 'react';
import {
  denimPalette,
  dangerPalette,
  leatherPalette,
  mossPalette,
  slatePalette,
} from '@/lib/design-tokens';

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

/** Common yes/no and status pill styles for tables and forms */
export const apothecaryBooleanPills = {
  yes: apothecaryPillStyle(mossPalette),
  no: apothecaryPillStyle(slatePalette),
  noAlert: apothecaryPillStyle(dangerPalette),
  craft: apothecaryPillStyle(leatherPalette),
  commerce: apothecaryPillStyle(denimPalette),
} as const;
