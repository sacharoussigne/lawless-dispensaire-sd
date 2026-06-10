import { auth } from '@/lib/auth';
import { userHasAnyAgendaAccess } from '@/lib/agenda/access';
import { getAppFeatureActionBlock } from '@/lib/appSettings';
import { requireDispensaryAccess } from '@/lib/dispensary/context';

export async function requireAgendaStreamAccess(
  request: Request,
  dispensarySlug: string,
): Promise<
  | { ok: true; dispensaryId: string; userId: string }
  | { ok: false; status: number; error: string }
> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Non autorisé' };
  }

  try {
    const { dispensary, effectiveRole } = await requireDispensaryAccess(
      session,
      dispensarySlug,
    );

    const featureBlock = await getAppFeatureActionBlock(dispensary.id, 'agenda');
    if (featureBlock) {
      return { ok: false, status: featureBlock.status, error: featureBlock.error };
    }

    const hasAccess = await userHasAnyAgendaAccess(
      dispensary.id,
      session.user.id,
      session.user.role,
      effectiveRole,
    );

    if (!hasAccess) {
      return { ok: false, status: 403, error: 'Accès agenda refusé' };
    }

    return { ok: true, dispensaryId: dispensary.id, userId: session.user.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'DISPENSARY_NOT_FOUND') {
      return { ok: false, status: 404, error: 'Dispensaire introuvable' };
    }
    if (message === 'DISPENSARY_ACCESS_DENIED') {
      return { ok: false, status: 403, error: 'Accès refusé à ce dispensaire' };
    }
    throw error;
  }
}
