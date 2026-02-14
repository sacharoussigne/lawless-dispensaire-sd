import type { OrderType } from '@prisma/client';

export enum OrderTypeEnum {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

/**
 * Transforme un type de commande en libellé français
 */
export function getOrderTypeLabel(type: OrderType): string {
  const labels: Record<OrderType, string> = {
    INCOMING: 'Commande entrante',
    OUTGOING: 'Commande sortante',
  };
  return labels[type];
}

/**
 * Transforme un type de commande en couleur Mantine
 */
export function getOrderTypeColor(type: OrderType): string {
  const colors: Record<OrderType, string> = {
    INCOMING: 'blue',
    OUTGOING: 'orange',
  };
  return colors[type];
}
