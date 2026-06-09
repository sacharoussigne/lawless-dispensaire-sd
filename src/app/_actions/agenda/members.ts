'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { canManageAgendaMembers } from '@/lib/agenda/access';
import { requireDispensaryAdminContext } from '@/lib/dispensary/serverActionContext';
import {
  upsertAgendaMemberSchema,
  removeAgendaMemberSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  searchEligibleDispensaryUsersForAgenda,
  validateDispensaryUserIds,
} from '@/app/_actions/agenda/internals';

export async function upsertAgendaMember(
  dispensarySlug: string,
  data: { agendaId: string; userId: string; accessLevel: 'OWNER' | 'WRITE' | 'READ' },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = upsertAgendaMemberSchema.parse(data);

    const canManage = await canManageAgendaMembers(
      ctx.tenant.dispensaryId,
      validated.agendaId,
      ctx.session.user.id,
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    if (!canManage) {
      return { status: 403, error: 'Droits insuffisants pour gérer les membres' };
    }

    const agenda = await prisma.agenda.findFirst({
      where: { id: validated.agendaId, ...tenantWhere(ctx.tenant.dispensaryId) },
      select: { id: true },
    });
    if (!agenda) {
      return { status: 404, error: 'Agenda introuvable' };
    }

    const validUser = await validateDispensaryUserIds(
      ctx.tenant.dispensaryId,
      [validated.userId],
    );
    if (!validUser) {
      return { status: 400, error: 'Utilisateur non membre du dispensaire' };
    }

    const member = await prisma.agendaMember.upsert({
      where: {
        agendaId_userId: {
          agendaId: validated.agendaId,
          userId: validated.userId,
        },
      },
      create: {
        agendaId: validated.agendaId,
        userId: validated.userId,
        accessLevel: validated.accessLevel,
      },
      update: { accessLevel: validated.accessLevel },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return { status: 200, data: member };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du membre');
  }
}

export async function removeAgendaMember(
  dispensarySlug: string,
  data: { agendaId: string; userId: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = removeAgendaMemberSchema.parse(data);

    const canManage = await canManageAgendaMembers(
      ctx.tenant.dispensaryId,
      validated.agendaId,
      ctx.session.user.id,
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    if (!canManage) {
      return { status: 403, error: 'Droits insuffisants pour gérer les membres' };
    }

    const ownerCount = await prisma.agendaMember.count({
      where: {
        agendaId: validated.agendaId,
        accessLevel: 'OWNER',
      },
    });

    const target = await prisma.agendaMember.findUnique({
      where: {
        agendaId_userId: {
          agendaId: validated.agendaId,
          userId: validated.userId,
        },
      },
    });

    if (!target) {
      return { status: 404, error: 'Membre introuvable' };
    }

    if (target.accessLevel === 'OWNER' && ownerCount <= 1) {
      return {
        status: 400,
        error: 'Impossible de retirer le dernier propriétaire',
      };
    }

    await prisma.agendaMember.delete({
      where: {
        agendaId_userId: {
          agendaId: validated.agendaId,
          userId: validated.userId,
        },
      },
    });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du membre');
  }
}

export type AgendaUserSearchResult = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function searchDispensaryUsersForAgenda(
  dispensarySlug: string,
  query: string,
  options?: { adminContext?: boolean },
) {
  try {
    let dispensaryId: string;

    if (options?.adminContext) {
      const auth = await requireDispensaryAdminContext(dispensarySlug);
      if (!auth.ok) {
        return { status: auth.status, error: auth.error };
      }
      dispensaryId = auth.ctx.dispensaryId;
    } else {
      const ctx = await getAgendaSessionContext(dispensarySlug);
      if (!ctx.ok) return ctx.response;
      dispensaryId = ctx.tenant.dispensaryId;
    }

    const data = await searchEligibleDispensaryUsersForAgenda(dispensaryId, query);

    return {
      status: 200,
      data,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la recherche');
  }
}
