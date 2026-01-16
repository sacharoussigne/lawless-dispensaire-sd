'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer une commande
const createOrderSchema = z.object({
  name: z.string().max(255, 'Le nom est trop long').optional(),
  status: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  details: z.string().max(1000, 'Les détails sont trop longs').optional(),
  companyId: z.string().uuid('ID d\'entreprise invalide'),
  items: z.array(
    z.object({
      itemId: z.string().uuid('ID d\'item invalide'),
      quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
    })
  ).min(1, 'Au moins un item est requis'),
});

/**
 * Crée une nouvelle commande
 */
export async function createOrder(data: {
  name?: string;
  status?: 'DRAFT' | 'LETTER_SENT' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
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

