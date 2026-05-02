'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

const optionalDefaultMailName = z
  .string()
  .max(255, 'Le nom du courrier par défaut est trop long')
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t ? t : undefined;
  });

const createMailTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().optional(),
  content: z.string().min(1, 'Le contenu est requis'),
  defaultMailName: optionalDefaultMailName,
});

const updateMailTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().optional(),
  content: z.string().min(1, 'Le contenu est requis'),
  defaultMailName: optionalDefaultMailName,
});

const deleteMailTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export async function createMailTemplate(data: {
  name: string;
  description?: string;
  content: string;
  defaultMailName?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = createMailTemplateSchema.parse(data);

    const mailTemplate = await prisma.mailTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        content: validatedData.content,
        defaultMailName: validatedData.defaultMailName ?? null,
        userId: null,
      },
    });

    return {
      status: 201,
      data: mailTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du modèle de courrier');
  }
}

export async function getMailTemplates() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const mailTemplates = await prisma.mailTemplate.findMany({
      where: {
        userId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: mailTemplates,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des modèles de courriers');
  }
}

export async function updateMailTemplate(data: {
  id: string;
  name: string;
  description?: string;
  content: string;
  defaultMailName?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = updateMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null) {
      return {
        status: 403,
        error: 'Ce template est un template personnel et ne peut pas être modifié depuis le panneau management',
      };
    }

    const mailTemplate = await prisma.mailTemplate.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        content: validatedData.content,
        defaultMailName: validatedData.defaultMailName ?? null,
      },
    });

    return {
      status: 200,
      data: mailTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du modèle de courrier');
  }
}

export async function deleteMailTemplate(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = deleteMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null) {
      return {
        status: 403,
        error: 'Ce template est un template personnel et ne peut pas être supprimé depuis le panneau management',
      };
    }

    await prisma.mailTemplate.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du modèle de courrier');
  }
}

export async function generateOrderMailPreview(data: {
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

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        individualCustomer: {
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

    const assignment = await prisma.orderMailTemplateAssignment.findUnique({
      where: {
        orderType_orderStatus: {
          orderType: order.type,
          orderStatus: order.status,
        },
      },
      include: {
        mailTemplate: true,
      },
    });

    if (!assignment) {
      return {
        status: 404,
        error: `Aucun modèle de courrier assigné pour le type "${order.type}" et le statut "${order.status}"`,
      };
    }

    const template = assignment.mailTemplate;

    const itemsText = order.items
      .map((orderItem) => {
        const itemName = orderItem.item.name;
        const quantity = orderItem.quantity;
        return `- ${itemName} (x${quantity})`;
      })
      .join('\n');

    const priceText = order.price != null ? `${order.price.toFixed(2)} $` : 'Non spécifié';

    const username = session.user.name || 'Utilisateur';

    let preview = template.content;
    const clientName =
      order.individualCustomer?.name ?? order.company?.name ?? 'Client';
    preview = preview.replace(/\${name}/g, clientName);
    preview = preview.replace(/\${items}/g, itemsText);
    preview = preview.replace(/\${price}/g, priceText);
    preview = preview.replace(/\${username}/g, username);

    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 18;

    if (isEvening) {
      preview = preview.replace(/Bonjour/gi, (match) => {
        if (match === 'Bonjour') return 'Bonsoir';
        if (match === 'BONJOUR') return 'BONSOIR';
        return 'bonsoir';
      });
      preview = preview.replace(/journée/gi, (match) => {
        if (match === 'Journée') return 'Soirée';
        if (match === 'JOURNÉE') return 'SOIRÉE';
        if (match === 'JOURNEE') return 'SOIREE';
        return 'soirée';
      });
    } else {
      preview = preview.replace(/Bonsoir/gi, (match) => {
        if (match === 'Bonsoir') return 'Bonjour';
        if (match === 'BONSOIR') return 'BONJOUR';
        return 'bonjour';
      });
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
    return actionErrorParser(error, 'Erreur lors de la génération de l\'aperçu du courrier');
  }
}

export async function getUserMailTemplates() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const mailTemplates = await prisma.mailTemplate.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: mailTemplates,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des modèles de courriers');
  }
}

export async function createUserMailTemplate(data: {
  name: string;
  description?: string;
  content: string;
  defaultMailName?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = createMailTemplateSchema.parse(data);

    const mailTemplate = await prisma.mailTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        content: validatedData.content,
        defaultMailName: validatedData.defaultMailName ?? null,
        userId: session.user.id,
      },
    });

    return {
      status: 201,
      data: mailTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du modèle de courrier');
  }
}

export async function updateUserMailTemplate(data: {
  id: string;
  name: string;
  description?: string;
  content: string;
  defaultMailName?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = updateMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null && existingTemplate.userId !== session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à modifier ce template',
      };
    }

    if (existingTemplate.userId === null) {
      const hasManagementPermission = checkRolePermission(session.user.role, 'application', 'management');
      if (!hasManagementPermission) {
        return {
          status: 403,
          error: 'Vous n\'êtes pas autorisé à modifier un template global',
        };
      }
    }

    const mailTemplate = await prisma.mailTemplate.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        content: validatedData.content,
        defaultMailName: validatedData.defaultMailName ?? null,
      },
    });

    return {
      status: 200,
      data: mailTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du modèle de courrier');
  }
}

export async function deleteUserMailTemplate(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = deleteMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null && existingTemplate.userId !== session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à supprimer ce template',
      };
    }

    if (existingTemplate.userId === null) {
      const hasManagementPermission = checkRolePermission(session.user.role, 'application', 'management');
      if (!hasManagementPermission) {
        return {
          status: 403,
          error: 'Vous n\'êtes pas autorisé à supprimer un template global',
        };
      }
    }

    await prisma.mailTemplate.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du modèle de courrier');
  }
}
