'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireServerActionContext } from '@/lib/serverActionAuth';

const createIndividualCustomerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

const deleteIndividualCustomerByNameSchema = z.object({
  name: z.string().min(1).max(255),
});

export async function getIndividualCustomers() {
  try {
    const ctx = await requireServerActionContext({
      feature: 'orders',
      permission: { resource: 'orders', action: 'view' },
    });
    if (!ctx.ok) return ctx.response;

    const customers = await prisma.individualCustomer.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      status: 200,
      data: customers,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des particuliers');
  }
}

export async function createIndividualCustomer(data: { name: string }) {
  try {
    const ctx = await requireServerActionContext({
      feature: 'orders',
      permission: { resource: 'orders', action: 'create' },
    });
    if (!ctx.ok) return ctx.response;

    const validated = createIndividualCustomerSchema.parse(data);

    const customer = await prisma.individualCustomer.create({
      data: { name: validated.name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      status: 201,
      data: customer,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du particulier');
  }
}

export async function deleteIndividualCustomerByName(data: { name: string }) {
  try {
    const ctx = await requireServerActionContext({
      feature: 'orders',
      permission: { resource: 'orders', action: 'delete' },
    });
    if (!ctx.ok) return ctx.response;

    const validated = deleteIndividualCustomerByNameSchema.parse(data);
    const trimmed = validated.name.trim();

    const customer = await prisma.individualCustomer.findFirst({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (!customer) {
      return {
        status: 404,
        error: 'Particulier introuvable',
      };
    }

    const orderCount = await prisma.order.count({
      where: { individualCustomerId: customer.id },
    });

    if (orderCount > 0) {
      return {
        status: 400,
        error: 'Impossible de supprimer : des commandes référencent ce particulier.',
      };
    }

    await prisma.individualCustomer.delete({
      where: { id: customer.id },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du particulier');
  }
}
