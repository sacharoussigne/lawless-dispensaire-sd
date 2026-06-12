import type { CSSProperties } from 'react';
import type { OrderStatus } from '@prisma/client';
import {
  apothecaryPillStyle,
  type ApothecaryPalette,
} from '@/lib/apothecaryPill';
import {
  clayPalette,
  dangerPalette,
  mossPalette,
  sagePalette,
  slatePalette,
  winePalette,
} from '@/lib/design-tokens';

export enum OrderStatusEnum {
    DRAFT = 'DRAFT',
    LETTER_SENT = 'LETTER_SENT',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Transforme un statut de commande en libellé français
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    DRAFT: 'Brouillon',
    LETTER_SENT: 'Lettre envoyée',
    PROCESSING: 'En traitement',
    READY: 'Prête',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
  };
  return labels[status];
}

const orderStatusPillPalettes: Record<OrderStatus, ApothecaryPalette> = {
  DRAFT: slatePalette,
  LETTER_SENT: winePalette,
  PROCESSING: clayPalette,
  READY: sagePalette,
  COMPLETED: mossPalette,
  CANCELLED: dangerPalette,
};

export function getOrderStatusPillStyle(status: OrderStatus): CSSProperties {
  return apothecaryPillStyle(orderStatusPillPalettes[status]);
}

