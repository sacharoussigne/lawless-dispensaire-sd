'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { addOrderItemsToStock } from '@/app/_actions/stock';
import type { OrderStatus } from '@prisma/client';

// Schéma de validation pour créer une commande
const createOrderSchema = z.object({
  name: z.string().max(255, 'Le nom est trop long').optional(),
  status: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  type: z.enum(['INCOMING', 'OUTGOING']).default('INCOMING'),
  details: z.string().max(1000, 'Les détails sont trop longs').optional(),
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

    const order = await prisma.order.create({
      data: {
        name: orderName,
        status: validatedData.status,
        type: validatedData.type,
        details: validatedData.details,
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
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: orders,
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

    // Récupérer l'ancien statut pour vérifier si on passe à COMPLETED
    const oldOrder = await prisma.order.findUnique({
      where: { id: validatedData.id },
      select: { status: true },
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

    const order = await prisma.order.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        status: validatedData.status,
        type: validatedData.type,
        details: validatedData.details,
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
              },
            },
          },
        },
      },
    });

    // Si le statut passe à COMPLETED et qu'on doit ajouter au stock
    if (
      oldOrder.status !== ('COMPLETED' as OrderStatus) &&
      validatedData.status === 'COMPLETED' &&
      data.addToStock === true
    ) {
      const stockResult = await addOrderItemsToStock(validatedData.id);
      if (stockResult.status !== 200) {
        // Si l'ajout au stock échoue, on retourne quand même la commande mise à jour
        // mais avec un avertissement
        return {
          status: 200,
          data: order,
          warning: 'La commande a été mise à jour mais l\'ajout au stock a échoué',
        };
      }
    }

    return {
      status: 200,
      data: order,
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

