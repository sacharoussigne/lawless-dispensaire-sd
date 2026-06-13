'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireDispensaryAdminContext } from '@/lib/dispensary/serverActionContext';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import {
  isDispensaryAdminRole,
  listAccessibleAgendaIds,
  userHasAnyAgendaAccess,
} from '@/lib/agenda/access';
import type { AgendaSummaryDTO } from '@/types/agenda';
import {
  createAgendaSchema,
  updateAgendaSchema,
  deleteAgendaSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  guardAgendaOwner,
  guardAgendaRead,
  validateDispensaryUserIds,
} from '@/app/_actions/agenda/internals';
import { canManageAgendaMembers } from '@/lib/agenda/access';

const agendaIncludeMembers = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { user: { name: 'asc' as const } },
  },
  _count: { select: { members: true } },
};

export async function listAgendasForAdmin(dispensarySlug: string) {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const agendas = await prisma.agenda.findMany({
      where: tenantWhere(auth.ctx.dispensaryId),
      include: agendaIncludeMembers,
      orderBy: { name: 'asc' },
    });

    return { status: 200, data: agendas };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des agendas');
  }
}

export async function listAccessibleAgendas(dispensarySlug: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const { dispensaryId, effectiveRole } = ctx.tenant;
    const { session } = ctx;

    const agendaIds = await listAccessibleAgendaIds(
      dispensaryId,
      session.user.id,
      session.user.role,
      effectiveRole,
    );

    if (agendaIds.length === 0) {
      return { status: 200, data: [] as AgendaSummaryDTO[] };
    }

    const agendas = await prisma.agenda.findMany({
      where: { id: { in: agendaIds }, ...tenantWhere(dispensaryId) },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { accessLevel: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data: AgendaSummaryDTO[] = agendas.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      accessLevel: a.members[0]?.accessLevel ?? null,
      memberCount: a._count.members,
    }));

    return { status: 200, data };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des agendas');
  }
}

export async function getAgendaPageBootstrap(dispensarySlug: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const { dispensaryId, effectiveRole } = ctx.tenant;
    const { session } = ctx;

    const hasAccess = await userHasAnyAgendaAccess(
      dispensaryId,
      session.user.id,
      session.user.role,
      effectiveRole,
    );

    const isAdmin = isDispensaryAdminRole(session.user.role, effectiveRole);

    if (!hasAccess) {
      return { status: 200, data: { hasAccess: false, isAdmin, agendas: [] as AgendaSummaryDTO[] } };
    }

    const agendaIds = await listAccessibleAgendaIds(
      dispensaryId,
      session.user.id,
      session.user.role,
      effectiveRole,
    );

    if (agendaIds.length === 0) {
      return { status: 200, data: { hasAccess: true, isAdmin, agendas: [] as AgendaSummaryDTO[] } };
    }

    const agendas = await prisma.agenda.findMany({
      where: { id: { in: agendaIds }, ...tenantWhere(dispensaryId) },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { accessLevel: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data: AgendaSummaryDTO[] = agendas.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      accessLevel: a.members[0]?.accessLevel ?? null,
      memberCount: a._count.members,
    }));

    return { status: 200, data: { hasAccess: true, isAdmin, agendas: data } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement de la page agenda');
  }
}

export async function checkAgendaModuleAccess(dispensarySlug: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const hasAccess = await userHasAnyAgendaAccess(
      ctx.tenant.dispensaryId,
      ctx.session.user.id,
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    const isAdmin = isDispensaryAdminRole(
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    return { status: 200, data: { hasAccess, isAdmin } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la vérification d\'accès');
  }
}

export async function createAgenda(
  dispensarySlug: string,
  data: { name: string; description?: string | null; ownerUserId: string },
) {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const validated = createAgendaSchema.parse(data);

    const validOwner = await validateDispensaryUserIds(
      auth.ctx.dispensaryId,
      [validated.ownerUserId],
    );

    if (!validOwner) {
      return {
        status: 400,
        error: 'Le propriétaire doit avoir accès au dispensaire',
      };
    }

    const agenda = await prisma.$transaction(async (tx) => {
      const created = await tx.agenda.create({
        data: {
          dispensaryId: auth.ctx.dispensaryId,
          name: validated.name,
          description: validated.description ?? null,
        },
      });

      await tx.agendaMember.create({
        data: {
          agendaId: created.id,
          userId: validated.ownerUserId,
          accessLevel: 'OWNER',
        },
      });

      return created;
    });

    return { status: 201, data: agenda };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'agenda');
  }
}

export async function updateAgenda(
  dispensarySlug: string,
  data: { id: string; name: string; description?: string | null },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateAgendaSchema.parse(data);
    const isAdmin = isDispensaryAdminRole(
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    if (!isAdmin) {
      const guard = await guardAgendaOwner(
        ctx.tenant.dispensaryId,
        validated.id,
        ctx.session,
        ctx.tenant.effectiveRole,
      );
      if (!guard.ok) {
        return { status: guard.status, error: guard.error };
      }
    }

    const agenda = await prisma.agenda.update({
      where: { id: validated.id, ...tenantWhere(ctx.tenant.dispensaryId) },
      data: {
        name: validated.name,
        description: validated.description ?? null,
      },
    });

    return { status: 200, data: agenda };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de l\'agenda');
  }
}

export async function deleteAgenda(dispensarySlug: string, id: string) {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const validated = deleteAgendaSchema.parse({ id });

    await prisma.agenda.deleteMany({
      where: { id: validated.id, ...tenantWhere(auth.ctx.dispensaryId) },
    });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'agenda');
  }
}

export async function getAgendaWithMembers(dispensarySlug: string, agendaId: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const canManage = await canManageAgendaMembers(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session.user.id,
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    if (!canManage) {
      const readGuard = await guardAgendaRead(
        ctx.tenant.dispensaryId,
        agendaId,
        ctx.session,
        ctx.tenant.effectiveRole,
      );
      if (!readGuard.ok) {
        return { status: readGuard.status, error: readGuard.error };
      }
    }

    const agenda = await prisma.agenda.findFirst({
      where: { id: agendaId, ...tenantWhere(ctx.tenant.dispensaryId) },
      include: agendaIncludeMembers,
    });

    if (!agenda) {
      return { status: 404, error: 'Agenda introuvable' };
    }

    return { status: 200, data: agenda };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement de l\'agenda');
  }
}
