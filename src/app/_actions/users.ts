'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['user', 'admin', 'employee', 'inventory_manager']).optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  role: z.enum(['user', 'admin', 'employee', 'inventory_manager']).optional(),
});

const setPasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(8),
});

const deleteUserSchema = z.object({
  id: z.string(),
});

export async function listUsers(params?: {
  searchValue?: string;
  searchField?: 'email' | 'name';
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  try {
    const result = await auth.api.listUsers({
      query: {
        searchValue: params?.searchValue,
        searchField: params?.searchField,
        limit: params?.limit?.toString(),
        offset: params?.offset?.toString(),
        sortBy: params?.sortBy,
        sortDirection: params?.sortDirection,
      },
      headers: await headers(),
    });

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    return {
      status: 500,
      error: error.message || 'Erreur lors de la récupération des utilisateurs',
    };
  }
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  try {
    const validated = createUserSchema.parse(data);

    const result = await auth.api.createUser({
      body: {
        email: validated.email,
        password: validated.password,
        name: validated.name,
        role: validated.role || 'user',
      },
      headers: await headers(),
    });

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        error: error.errors,
      };
    }
    return {
      status: 500,
      error: error.message || 'Erreur lors de la création de l\'utilisateur',
    };
  }
}

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
  try {
    const validated = updateUserSchema.parse(data);

    const result = await auth.api.adminUpdateUser({
      body: {
        userId: validated.id,
        data: {
          name: validated.name,
          role: validated.role,
        }
      },
      headers: await headers(),
    });

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        error: error.errors,
      };
    }
    return {
      status: 500,
      error: error.message || 'Erreur lors de la mise à jour de l\'utilisateur',
    };
  }
}

export async function setPassword(data: z.infer<typeof setPasswordSchema>) {
  try {
    const validated = setPasswordSchema.parse(data);

    const result = await auth.api.setUserPassword({
      body: {
        userId: validated.userId,
        newPassword: validated.password,
      },
      headers: await headers(),
    });

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        error: error.errors,
      };
    }
    return {
      status: 500,
      error: error.message || 'Erreur lors du changement de mot de passe',
    };
  }
}

export async function deleteUser(data: z.infer<typeof deleteUserSchema>) {
  try {
    const validated = deleteUserSchema.parse(data);

    // Suppression directe via Prisma
    // Les sessions et accounts seront supprimés automatiquement grâce à onDelete: Cascade
    await prisma.user.delete({
      where: {
        id: validated.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        error: error.errors,
      };
    }
    return {
      status: 500,
      error: error.message || 'Erreur lors de la suppression de l\'utilisateur',
    };
  }
}

export async function impersonateUser(userId: string) {
  try {
    // Utiliser l'API admin pour l'impersonation
    // Note: better-auth expose l'impersonation via l'API admin
    const result = await (auth.api as any).admin.impersonateUser({
      body: {
        userId,
      },
      headers: await headers(),
    });

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    // Si admin.impersonateUser ne fonctionne pas, essayer impersonateUser directement
    try {
      const result = await auth.api.impersonateUser({
        body: {
          userId,
        },
        headers: await headers(),
      });

      return {
        status: 200,
        data: result,
      };
    } catch (fallbackError: any) {
      return {
        status: 500,
        error: error.message || fallbackError.message || 'Erreur lors de l\'impersonation',
      };
    }
  }
}

