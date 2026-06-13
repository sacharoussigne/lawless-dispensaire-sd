'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requirePermission, requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import type { OrderStatus, OrderType } from '@prisma/client';

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

const getUserMailTemplatesPageSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  nameSearch: z.string().max(255).optional(),
});

const getUserMailTemplateByIdSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export async function createMailTemplate(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    content: string;
    defaultMailName?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createMailTemplateSchema.parse(data);

    const mailTemplate = await prisma.mailTemplate.create({
      data: {
        dispensaryId,
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

export async function getMailTemplates(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const mailTemplates = await prisma.mailTemplate.findMany({
      where: {
        userId: null,
        ...tenantWhere(dispensaryId),
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

export async function updateMailTemplate(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    content: string;
    defaultMailName?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
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
        ...tenantWhere(dispensaryId),
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

export async function deleteMailTemplate(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
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
        ...tenantWhere(dispensaryId),
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

type OrderMailPreviewSource = {
  type: string;
  status: string;
  price: unknown;
  company: { name: string } | null;
  individualCustomer: { name: string } | null;
  items: Array<{
    quantity: number;
    item: { name: string };
  }>;
};

export async function generateOrderMailPreview(
  dispensarySlug: string,
  data: {
    orderId?: string;
    order?: OrderMailPreviewSource;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    let order: OrderMailPreviewSource | null = data.order ?? null;

    if (!order) {
      if (!data.orderId) {
        return {
          status: 400,
          error: 'Commande requise pour générer l\'aperçu',
        };
      }

      const dbOrder = await prisma.order.findFirst({
        where: { id: data.orderId, ...tenantWhere(dispensaryId) },
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

      if (!dbOrder) {
        return {
          status: 404,
          error: 'Commande introuvable',
        };
      }

      order = dbOrder;
    }

    const assignment = await prisma.orderMailTemplateAssignment.findUnique({
      where: {
        dispensaryId_orderType_orderStatus: {
          dispensaryId,
          orderType: order.type as OrderType,
          orderStatus: order.status as OrderStatus,
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

    const priceValue = order.price != null ? Number(order.price) : null;
    const priceText =
      priceValue != null && Number.isFinite(priceValue)
        ? `${priceValue.toFixed(2)} $`
        : 'Non spécifié';

    const username = ctx.session.user.name || 'Utilisateur';

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

export async function getUserMailTemplatesPage(
  dispensarySlug: string,
  params: {
    page?: number;
    pageSize?: number;
    nameSearch?: string;
  } = {},
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { page, pageSize, nameSearch } =
      getUserMailTemplatesPageSchema.parse(params);
    const nameTerm = nameSearch?.trim();

    const where = {
      userId: ctx.session.user.id,
      ...tenantWhere(dispensaryId),
      ...(nameTerm
        ? {
            name: {
              contains: nameTerm,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [mailTemplates, totalCount] = await Promise.all([
      prisma.mailTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          defaultMailName: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.mailTemplate.count({ where }),
    ]);

    return {
      status: 200,
      data: {
        items: mailTemplates,
        totalCount,
        page,
        pageSize,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des modèles de courriers');
  }
}

export async function getUserMailTemplateById(
  dispensarySlug: string,
  data: { id: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { id } = getUserMailTemplateByIdSchema.parse(data);

    const mailTemplate = await prisma.mailTemplate.findFirst({
      where: {
        id,
        userId: ctx.session.user.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!mailTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    return {
      status: 200,
      data: mailTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération du modèle de courrier');
  }
}

export async function getUserMailTemplateOptions(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const options = await prisma.mailTemplate.findMany({
      where: {
        userId: ctx.session.user.id,
        ...tenantWhere(dispensaryId),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      status: 200,
      data: options,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des modèles de courriers');
  }
}

/** @deprecated Use getUserMailTemplatesPage or getUserMailTemplateById */
export async function getUserMailTemplates(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const mailTemplates = await prisma.mailTemplate.findMany({
      where: {
        userId: ctx.session.user.id,
        ...tenantWhere(dispensaryId),
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

export async function createUserMailTemplate(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    content: string;
    defaultMailName?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createMailTemplateSchema.parse(data);

    const mailTemplate = await prisma.mailTemplate.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        description: validatedData.description,
        content: validatedData.content,
        defaultMailName: validatedData.defaultMailName ?? null,
        userId: ctx.session.user.id,
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

export async function updateUserMailTemplate(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    content: string;
    defaultMailName?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId, effectiveRole } = ctx.tenant;

    const validatedData = updateMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null && existingTemplate.userId !== ctx.session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à modifier ce template',
      };
    }

    if (existingTemplate.userId === null) {
      const permResult = requirePermission(
        effectiveRole,
        'application',
        'management',
        'Vous n\'êtes pas autorisé à modifier un template global',
      );
      if (!permResult.ok) return permResult.response;
    }

    const mailTemplate = await prisma.mailTemplate.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
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

export async function deleteUserMailTemplate(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId, effectiveRole } = ctx.tenant;

    const validatedData = deleteMailTemplateSchema.parse(data);

    const existingTemplate = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!existingTemplate) {
      return {
        status: 404,
        error: 'Template introuvable',
      };
    }

    if (existingTemplate.userId !== null && existingTemplate.userId !== ctx.session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à supprimer ce template',
      };
    }

    if (existingTemplate.userId === null) {
      const permResult = requirePermission(
        effectiveRole,
        'application',
        'management',
        'Vous n\'êtes pas autorisé à supprimer un template global',
      );
      if (!permResult.ok) return permResult.response;
    }

    await prisma.mailTemplate.delete({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
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
