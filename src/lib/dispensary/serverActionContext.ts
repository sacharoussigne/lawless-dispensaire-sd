'use server';

import { getAuthSession } from '@/lib/auth';
import {
  requireDispensaryAccess,
  requireDispensaryFromSlug,
  type DispensaryContext,
} from '@/lib/dispensary/context';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';

export type TenantActionContext = {
  dispensary: DispensaryContext;
  dispensaryId: string;
  effectiveRole: string | null;
  userId: string;
};

export async function requireTenantActionContext(
  dispensarySlug: string,
): Promise<
  | { ok: true; ctx: TenantActionContext }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Non autorisé' };
  }

  try {
    const { dispensary, effectiveRole } = await requireDispensaryAccess(session, dispensarySlug);
    return {
      ok: true,
      ctx: {
        dispensary,
        dispensaryId: dispensary.id,
        effectiveRole,
        userId: session.user.id,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'DISPENSARY_NOT_FOUND') {
      return { ok: false, status: 404, error: 'Dispensaire introuvable' };
    }
    if (message === 'DISPENSARY_ACCESS_DENIED') {
      return { ok: false, status: 403, error: 'Accès refusé à ce dispensaire' };
    }
    throw e;
  }
}

export async function requireDispensaryAdminContext(
  dispensarySlug: string,
): Promise<
  | { ok: true; ctx: TenantActionContext }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  const base = await requireTenantActionContext(dispensarySlug);
  if (!base.ok) {
    return base;
  }
  const session = await getAuthSession();
  const platform = isPlatformAdmin(session?.user?.role);
  const tenantAdmin = hasRole(base.ctx.effectiveRole, Role.ADMIN);
  if (!platform && !tenantAdmin) {
    return { ok: false, status: 403, error: 'Droits administrateur requis' };
  }
  return base;
}

export async function requirePlatformAdminContext(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Non autorisé' };
  }
  if (!isPlatformAdmin(session.user.role)) {
    return { ok: false, status: 403, error: 'Droits super-admin requis' };
  }
  return { ok: true, userId: session.user.id };
}

export async function resolveDispensaryIdBySlug(slug: string): Promise<string | null> {
  try {
    const d = await requireDispensaryFromSlug(slug);
    return d.id;
  } catch {
    return null;
  }
}
