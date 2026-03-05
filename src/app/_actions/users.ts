'use server';

import { auth, getAuthSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';

const roleEnum = z.enum(['user', 'admin', 'employee', 'inventory_manager', 'inventory_viewer', 'private_practitioner']);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  roles: z.array(roleEnum).optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  roles: z.array(roleEnum).optional(),
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

/**
 * List users for bank access management
 * Returns only id and name, accessible to roles with application.access (including employee)
 */
export async function listUsersForBankAccess() {
  try {
    const session = await getAuthSession();

    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const role = session.user?.role ?? null;
    const hasAccess = checkRolePermission(role, 'application', 'access');

    if (!hasAccess) {
      return {
        status: 403,
        error: 'Accès refusé',
      };
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      status: 200,
      data: {
        users,
      },
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
        role: (validated.roles && validated.roles.length > 0)
          ? (validated.roles.join(',') as any)
          : ('user' as any),
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
          role: validated.roles && validated.roles.length > 0
            ? validated.roles.join(',')
            : undefined,
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

    // Direct deletion via Prisma
    // Sessions and accounts are deleted automatically thanks to onDelete: Cascade
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

