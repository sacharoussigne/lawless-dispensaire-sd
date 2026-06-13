import type { CSSProperties } from 'react';
import type { OrderType } from '@prisma/client';
import { apothecaryPillStyle, type ApothecaryPalette } from '@/lib/apothecaryPill';
import { denimPalette, leatherPalette } from '@/lib/design-tokens';

export enum OrderTypeEnum {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

/**
 * Transforme un type de commande en libellé français
 */
export function getOrderTypeLabel(type: OrderType): string {
  const labels: Record<OrderType, string> = {
    INCOMING: 'Entrante',
    OUTGOING: 'Sortante',
  };
  return labels[type];
}

const orderTypePillPalettes: Record<OrderType, ApothecaryPalette> = {
  INCOMING: denimPalette,
  OUTGOING: leatherPalette,
};

export function getOrderTypePillStyle(type: OrderType): CSSProperties {
  return apothecaryPillStyle(orderTypePillPalettes[type]);
}
