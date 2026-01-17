import type { OrderStatus } from '@prisma/client';

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

/**
 * Transforme un statut de commande en couleur Mantine
 */
export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    DRAFT: 'gray',
    LETTER_SENT: 'grape',
    PROCESSING: 'orange',
    READY: 'green',
    COMPLETED: 'teal',
    CANCELLED: 'red',
  };
  return colors[status];
}

