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
