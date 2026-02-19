'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un template de lettre
const createLetterTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

// Schéma de validation pour modifier un template de lettre
const updateLetterTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

// Schéma pour supprimer un template de lettre
const deleteLetterTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau template de lettre
 */
export async function createLetterTemplate(data: {
  name: string;
  content: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createLetterTemplateSchema.parse(data);

    const letterTemplate = await prisma.letterTemplate.create({
      data: {
        name: validatedData.name,
        content: validatedData.content,
      },
    });

    return {
      status: 201,
      data: letterTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du template de lettre');
  }
}

/**
 * Récupère tous les templates de lettres
 */
export async function getLetterTemplates() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const letterTemplates = await prisma.letterTemplate.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: letterTemplates,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des templates de lettres');
  }
}

/**
 * Modifie un template de lettre existant
 */
export async function updateLetterTemplate(data: {
  id: string;
  name: string;
  content: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateLetterTemplateSchema.parse(data);

    const letterTemplate = await prisma.letterTemplate.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        content: validatedData.content,
      },
    });

    return {
      status: 200,
      data: letterTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du template de lettre');
  }
}

/**
 * Supprime un template de lettre
 */
export async function deleteLetterTemplate(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteLetterTemplateSchema.parse(data);

    await prisma.letterTemplate.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du template de lettre');
  }
}

/**
 * Génère l'aperçu de la lettre pour une commande
 */
export async function generateOrderLetterPreview(data: {
  orderId: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
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

    if (!order) {
      return {
        status: 404,
        error: 'Commande introuvable',
      };
    }

    // Déterminer le nom du template selon le type de commande
    const templateName = order.type === 'INCOMING' ? 'order-incoming' : 'order-outgoing';

    // Récupérer le template
    const template = await prisma.letterTemplate.findFirst({
      where: { name: templateName },
    });

    if (!template) {
      return {
        status: 404,
        error: `Template "${templateName}" introuvable`,
      };
    }

    // Formater les items
    const itemsText = order.items
      .map((orderItem) => {
        const itemName = orderItem.item.name;
        const quantity = orderItem.quantity;
        return `- ${itemName} (x${quantity})`;
      })
      .join('\n');

    // Formater le prix
    const priceText = order.price != null ? `${order.price.toFixed(2)} $` : 'Non spécifié';

    // Récupérer le nom d'utilisateur de la session
    const username = session.user.name || 'Utilisateur';

    // Remplacer les variables dans le template
    let preview = template.content;
    preview = preview.replace(/\${name}/g, order.company.name);
    preview = preview.replace(/\${items}/g, itemsText);
    preview = preview.replace(/\${price}/g, priceText);
    preview = preview.replace(/\${username}/g, username);

    // Remplacer les salutations selon l'heure de la journée
    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 18; // Après 18h = soir

    if (isEvening) {
      // Remplacer "Bonjour" par "Bonsoir" (gère les variations de casse)
      preview = preview.replace(/Bonjour/gi, (match) => {
        // Préserver la casse : "Bonjour" -> "Bonsoir", "bonjour" -> "bonsoir", "BONJOUR" -> "BONSOIR"
        if (match === 'Bonjour') return 'Bonsoir';
        if (match === 'BONJOUR') return 'BONSOIR';
        return 'bonsoir';
      });
      // Remplacer "journée" par "soirée" (gère les variations de casse)
      preview = preview.replace(/journée/gi, (match) => {
        if (match === 'Journée') return 'Soirée';
        if (match === 'JOURNÉE') return 'SOIRÉE';
        if (match === 'JOURNEE') return 'SOIREE';
        return 'soirée';
      });
    } else {
      // Remplacer "Bonsoir" par "Bonjour" (gère les variations de casse)
      preview = preview.replace(/Bonsoir/gi, (match) => {
        if (match === 'Bonsoir') return 'Bonjour';
        if (match === 'BONSOIR') return 'BONJOUR';
        return 'bonjour';
      });
      // Remplacer "soirée" par "journée" (gère les variations de casse)
      preview = preview.replace(/soirée/gi, (match) => {
        if (match === 'Soirée') return 'Journée';
        if (match === 'SOIRÉE') return 'JOURNÉE';
        if (match === 'SOIREE') return 'JOURNEE';
        return 'journée';
      });
    }

    return {
      status: 200,
      data: {
        preview,
        templateName: template.name,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la génération de l\'aperçu de la lettre');
  }
}
