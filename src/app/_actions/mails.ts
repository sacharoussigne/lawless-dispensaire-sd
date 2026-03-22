'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

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

export async function createMail(data: {
  name: string;
  receiver: string;
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

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = createMailSchema.parse(data);

    const mail = await prisma.mail.create({
      data: {
        name: validatedData.name,
        receiver: validatedData.receiver,
        content: validatedData.content,
        senderId: session.user.id,
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

export async function getMails() {
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

    const mails = await prisma.mail.findMany({
      where: {
        senderId: session.user.id,
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

export async function updateMail(data: {
  id: string;
  name: string;
  receiver: string;
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

    const mailsFeatureBlock = await getAppFeatureActionBlock('mails');
    if (mailsFeatureBlock) return mailsFeatureBlock;

    const validatedData = updateMailSchema.parse(data);

    const existingMail = await prisma.mail.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingMail) {
      return {
        status: 404,
        error: 'Courrier introuvable',
      };
    }

    if (existingMail.senderId !== session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à modifier ce courrier',
      };
    }

    const mail = await prisma.mail.update({
      where: {
        id: validatedData.id,
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

export async function deleteMail(data: { id: string }) {
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

    const validatedData = deleteMailSchema.parse(data);

    const existingMail = await prisma.mail.findUnique({
      where: {
        id: validatedData.id,
      },
    });

    if (!existingMail) {
      return {
        status: 404,
        error: 'Courrier introuvable',
      };
    }

    if (existingMail.senderId !== session.user.id) {
      return {
        status: 403,
        error: 'Vous n\'êtes pas autorisé à supprimer ce courrier',
      };
    }

    await prisma.mail.delete({
      where: {
        id: validatedData.id,
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
