'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createMailSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  receiver: z.string().min(1, 'Le destinataire est requis').max(255, 'Le destinataire est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

const updateMailSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  receiver: z.string().min(1, 'Le destinataire est requis').max(255, 'Le destinataire est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

const deleteMailSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const getMailsPageSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  nameSearch: z.string().max(255).optional(),
  receiverSearch: z.string().max(255).optional(),
});

const getMailByIdSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const CONTENT_PREVIEW_LENGTH = 120;

function truncateContentPreview(content: string): string {
  if (content.length <= CONTENT_PREVIEW_LENGTH) {
    return content;
  }
  return `${content.substring(0, CONTENT_PREVIEW_LENGTH)}...`;
}

export async function createMail(
  dispensarySlug: string,
  data: {
    name: string;
    receiver: string;
    content: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createMailSchema.parse(data);

    const mail = await prisma.mail.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        receiver: validatedData.receiver,
        content: validatedData.content,
        senderId: ctx.session.user.id,
      },
    });

    return {
      status: 201,
      data: mail,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du courrier');
  }
}

export async function getMailsPage(
  dispensarySlug: string,
  params: {
    page?: number;
    pageSize?: number;
    nameSearch?: string;
    receiverSearch?: string;
  } = {},
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { page, pageSize, nameSearch, receiverSearch } =
      getMailsPageSchema.parse(params);
    const nameTerm = nameSearch?.trim();
    const receiverTerm = receiverSearch?.trim();

    const where = {
      senderId: ctx.session.user.id,
      ...tenantWhere(dispensaryId),
      ...(nameTerm
        ? {
            name: {
              contains: nameTerm,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(receiverTerm
        ? {
            receiver: {
              contains: receiverTerm,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [mails, totalCount] = await Promise.all([
      prisma.mail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          receiver: true,
          createdAt: true,
          content: true,
        },
      }),
      prisma.mail.count({ where }),
    ]);

    return {
      status: 200,
      data: {
        items: mails.map(({ content, ...mail }) => ({
          ...mail,
          contentPreview: truncateContentPreview(content),
        })),
        totalCount,
        page,
        pageSize,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des courriers');
  }
}

export async function getMailById(
  dispensarySlug: string,
  data: { id: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { id } = getMailByIdSchema.parse(data);

    const mail = await prisma.mail.findFirst({
      where: {
        id,
        senderId: ctx.session.user.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!mail) {
      return {
        status: 404,
        error: 'Courrier introuvable',
      };
    }

    return {
      status: 200,
      data: mail,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération du courrier');
  }
}

/** @deprecated Use getMailsPage or getMailById */
export async function getMails(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const mails = await prisma.mail.findMany({
      where: {
        senderId: ctx.session.user.id,
        ...tenantWhere(dispensaryId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: mails,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des courriers');
  }
}

export async function updateMail(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    receiver: string;
    content: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateMailSchema.parse(data);

    const existingMail = await prisma.mail.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!existingMail) {
      return {
        status: 404,
        error: 'Courrier introuvable',
      };
    }

    if (existingMail.senderId !== ctx.session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à modifier ce courrier',
      };
    }

    const mail = await prisma.mail.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        receiver: validatedData.receiver,
        content: validatedData.content,
      },
    });

    return {
      status: 200,
      data: mail,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du courrier');
  }
}

export async function deleteMail(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'mails',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteMailSchema.parse(data);

    const existingMail = await prisma.mail.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!existingMail) {
      return {
        status: 404,
        error: 'Courrier introuvable',
      };
    }

    if (existingMail.senderId !== ctx.session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à supprimer ce courrier',
      };
    }

    await prisma.mail.delete({
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
    return actionErrorParser(error, 'Erreur lors de la suppression du courrier');
  }
}
