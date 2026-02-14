'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { addOrderItemsToStock, removeOrderItemsFromStock } from '@/app/_actions/stock';
import type { OrderStatus } from '@prisma/client';

// Schéma de validation pour créer une commande
const createOrderSchema = z.object({
  name: z.string().max(255, 'Le nom est trop long').optional(),
  status: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  type: z.enum(['INCOMING', 'OUTGOING']).default('INCOMING'),
  details: z.string().max(1000, 'Les détails sont trop longs').optional(),
  price: z.number().positive('Le prix doit être positif').optional(),
  companyId: z.string().uuid('ID d\'entreprise invalide'),
  items: z.array(
    z.object({
      itemId: z.string().uuid('ID d\'item invalide'),
      quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
    })
  ).min(1, 'Au moins un objet est requis'),
});

/**
 * Crée une nouvelle commande
 */
export async function createOrder(data: {
  name?: string;
  status?: 'DRAFT' | 'LETTER_SENT' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  type?: 'INCOMING' | 'OUTGOING';
  details?: string;
  price?: number;
  companyId: string;
  items: { itemId: string; quantity: number }[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createOrderSchema.parse(data);

    // Générer le nom automatiquement si non fourni
    let orderName = validatedData.name;
    if (!orderName) {
      // Récupérer l'entreprise
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
        select: { name: true },
      });

      if (!company) {
        return {
          status: 404,
          error: 'Entreprise introuvable',
        };
      }

      // Compter le nombre de commandes existantes pour cette entreprise
      const orderCount = await prisma.order.count({
        where: { companyId: validatedData.companyId },
      });

      // Générer le nom : nom-entreprise en minuscules avec tirets + numéro séquentiel
      const companyNameSlug = company.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9]+/g, '-') // Remplacer tout ce qui n'est pas alphanumérique par un tiret
        .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début et fin

      const sequentialNumber = String(orderCount + 1).padStart(4, '0');
      orderName = `${companyNameSlug}-${sequentialNumber}`;
    }

    // Calculer le prix selon le type de commande
    let orderPrice: number | null = null;
    
    if (validatedData.type === 'OUTGOING') {
      // Pour les commandes sortantes, calculer le prix à partir des items
      const itemsWithPrices = await prisma.item.findMany({
        where: {
          id: { in: validatedData.items.map((item) => item.itemId) },
        },
        select: {
          id: true,
          price: true,
        },
      });

      const totalPrice = validatedData.items.reduce((sum, orderItem) => {
        const item = itemsWithPrices.find((i) => i.id === orderItem.itemId);
        if (item && item.price) {
          const itemPrice = Number(item.price);
          return sum + itemPrice * orderItem.quantity;
        }
        return sum;
      }, 0);

      orderPrice = totalPrice > 0 ? totalPrice : null;
    } else if (validatedData.type === 'INCOMING') {
      // Pour les commandes entrantes, utiliser le prix fourni
      orderPrice = validatedData.price ?? null;
    }

    const order = await prisma.order.create({
      data: {
        name: orderName,
        status: validatedData.status,
        type: validatedData.type,
        details: validatedData.details,
        ...(orderPrice !== null && { price: orderPrice }),
        companyId: validatedData.companyId,
        items: {
          create: validatedData.items.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: order,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la commande');
  }
}

// Schéma de validation pour modifier une commande
const updateOrderSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long').optional(),
  status: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['INCOMING', 'OUTGOING']).optional(),
  details: z.string().max(1000, 'Les détails sont trop longs').optional(),
  price: z.number().positive('Le prix doit être positif').optional(),
});

// Schéma pour supprimer une commande
const deleteOrderSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Récupère toutes les commandes
 */
export async function getOrders() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Convertir les Decimal en number pour la sérialisation
    const serializedOrders = orders.map((order: any) => ({
      ...order,
      price: order.price ? Number(order.price) : null,
      items: order.items.map((orderItem: any) => ({
        ...orderItem,
        item: {
          ...orderItem.item,
          price: orderItem.item.price ? Number(orderItem.item.price) : null,
        },
      })),
    }));

    return {
      status: 200,
      data: serializedOrders,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des commandes');
  }
}

/**
 * Modifie une commande existante
 */
export async function updateOrder(data: {
  id: string;
  name?: string;
  status?: 'DRAFT' | 'LETTER_SENT' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  type?: 'INCOMING' | 'OUTGOING';
  details?: string;
  price?: number;
  addToStock?: boolean;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateOrderSchema.parse(data);

    // Récupérer l'ancien statut, le type et les items pour vérifier si on passe à COMPLETED
    const oldOrder = await prisma.order.findUnique({
      where: { id: validatedData.id },
      select: { 
        status: true, 
        type: true,
        items: {
          select: {
            itemId: true,
            quantity: true,
          },
        },
      },
    });

    if (!oldOrder) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    // Empêcher la modification d'une commande terminée
    if (oldOrder.status === ('COMPLETED' as OrderStatus)) {
      return {
        status: 403,
        error: 'Les commandes terminées ne peuvent pas être modifiées',
      };
    }

    // Déterminer le type de commande (utiliser le nouveau type si fourni, sinon l'ancien)
    const orderType = validatedData.type || oldOrder.type;

    // Calculer le prix selon le type de commande
    let orderPrice: number | null | undefined = undefined;
    
    if (orderType === 'OUTGOING') {
      // Pour les commandes sortantes, calculer le prix à partir des items
      const itemsWithPrices = await prisma.item.findMany({
        where: {
          id: { in: oldOrder.items.map((item) => item.itemId) },
        },
        select: {
          id: true,
          price: true,
        },
      });

      const totalPrice = oldOrder.items.reduce((sum, orderItem) => {
        const item = itemsWithPrices.find((i) => i.id === orderItem.itemId);
        if (item && item.price) {
          const itemPrice = Number(item.price);
          return sum + itemPrice * orderItem.quantity;
        }
        return sum;
      }, 0);

      orderPrice = totalPrice > 0 ? totalPrice : null;
    } else if (orderType === 'INCOMING') {
      // Pour les commandes entrantes, utiliser le prix fourni (ou garder l'ancien si non fourni)
      if (validatedData.price !== undefined) {
        orderPrice = validatedData.price ?? null;
      }
      // Si price n'est pas fourni, on ne modifie pas le prix existant (undefined)
    }

    const updateData: any = {
      name: validatedData.name,
      status: validatedData.status,
      type: validatedData.type,
      details: validatedData.details,
    };

    // Ne mettre à jour le prix que s'il a été calculé ou fourni
    if (orderPrice !== undefined) {
      updateData.price = orderPrice !== null ? orderPrice : undefined;
    }

    const order = await prisma.order.update({
      where: {
        id: validatedData.id,
      },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Convertir les Decimal en number pour la sérialisation
    const serializedOrder = {
      ...order,
      price: (order as any).price ? Number((order as any).price) : null,
      items: order.items.map((orderItem: any) => ({
        ...orderItem,
        item: {
          ...orderItem.item,
          price: orderItem.item.price ? Number(orderItem.item.price) : null,
        },
      })),
    };

    // Si le statut passe à COMPLETED
    if (
      oldOrder.status !== ('COMPLETED' as OrderStatus) &&
      validatedData.status === 'COMPLETED'
    ) {
      // Pour les commandes entrantes (INCOMING), ajouter au stock si demandé
      if (orderType === 'INCOMING' && data.addToStock === true) {
        const stockResult = await addOrderItemsToStock(validatedData.id);
        if (stockResult.status !== 200) {
          return {
            status: 200,
            data: serializedOrder,
            warning: 'La commande a été mise à jour mais l\'ajout au stock a échoué',
          };
        }
      }
      
      // Pour les commandes sortantes (OUTGOING), retirer du stock automatiquement
      if (orderType === 'OUTGOING') {
        const stockResult = await removeOrderItemsFromStock(validatedData.id);
        if (stockResult.status !== 200) {
          const errorMessage = 'error' in stockResult ? stockResult.error : 'La commande a été mise à jour mais le retrait du stock a échoué';
          return {
            status: 200,
            data: serializedOrder,
            warning: errorMessage,
          };
        }
      }
    }

    return {
      status: 200,
      data: serializedOrder,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la commande');
  }
}

/**
 * Supprime une commande
 */
export async function deleteOrder(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteOrderSchema.parse(data);

    // Vérifier le statut de la commande avant de la supprimer
    const order = await prisma.order.findUnique({
      where: { id: validatedData.id },
      select: { status: true },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    // Empêcher la suppression d'une commande terminée
    if (order.status === ('COMPLETED' as OrderStatus)) {
      return {
        status: 403,
        error: 'Les commandes terminées ne peuvent pas être supprimées',
      };
    }

    await prisma.order.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la commande');
  }
}

