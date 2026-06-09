import { requireTenantServerActionContext, type AuthSession } from '@/lib/serverActionAuth';
import {
  requireAgendaRead,
  requireAgendaWrite,
  requireAgendaOwner,
  resolveAgendaAccess,
} from '@/lib/agenda/access';
import prisma from '@/lib/prisma';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

export async function requireAgendaFeatureContext(dispensarySlug: string) {
  return requireTenantServerActionContext(dispensarySlug, {
    feature: 'agenda',
  });
}

export async function getAgendaSessionContext(dispensarySlug: string) {
  const ctx = await requireAgendaFeatureContext(dispensarySlug);
  if (!ctx.ok) return ctx;
  return {
    ok: true as const,
    tenant: ctx.tenant,
    session: ctx.session,
  };
}

export async function guardAgendaRead(
  dispensaryId: string,
  agendaId: string,
  session: AuthSession,
  effectiveRole: string | null | undefined,
) {
  return requireAgendaRead(
    dispensaryId,
    agendaId,
    session.user.id,
    session.user.role,
    effectiveRole,
  );
}

export async function guardAgendaWrite(
  dispensaryId: string,
  agendaId: string,
  session: AuthSession,
  effectiveRole: string | null | undefined,
) {
  return requireAgendaWrite(
    dispensaryId,
    agendaId,
    session.user.id,
    session.user.role,
    effectiveRole,
  );
}

export async function guardAgendaOwner(
  dispensaryId: string,
  agendaId: string,
  session: AuthSession,
  effectiveRole: string | null | undefined,
) {
  return requireAgendaOwner(
    dispensaryId,
    agendaId,
    session.user.id,
    session.user.role,
    effectiveRole,
  );
}

export async function resolveAgendaIdFromTodoListId(
  dispensaryId: string,
  listId: string,
): Promise<string | null> {
  const list = await prisma.agendaTodoList.findFirst({
    where: {
      id: listId,
      agenda: tenantWhere(dispensaryId),
    },
    select: { agendaId: true },
  });
  return list?.agendaId ?? null;
}

export async function resolveAgendaIdFromTodoCategoryId(
  dispensaryId: string,
  categoryId: string,
): Promise<string | null> {
  const category = await prisma.agendaTodoCategory.findFirst({
    where: {
      id: categoryId,
      list: { agenda: tenantWhere(dispensaryId) },
    },
    select: { list: { select: { agendaId: true } } },
  });
  return category?.list.agendaId ?? null;
}

export async function resolveAgendaIdFromTodoTaskId(
  dispensaryId: string,
  taskId: string,
): Promise<string | null> {
  const task = await prisma.agendaTodoTask.findFirst({
    where: {
      id: taskId,
      category: { list: { agenda: tenantWhere(dispensaryId) } },
    },
    select: {
      category: { select: { list: { select: { agendaId: true } } } },
    },
  });
  return task?.category.list.agendaId ?? null;
}

export async function resolveAgendaIdFromEventId(
  dispensaryId: string,
  eventId: string,
): Promise<string | null> {
  const event = await prisma.agendaEvent.findFirst({
    where: {
      id: eventId,
      agenda: tenantWhere(dispensaryId),
    },
    select: { agendaId: true },
  });
  return event?.agendaId ?? null;
}

export async function resolveAgendaIdFromEventTodoTaskId(
  dispensaryId: string,
  taskId: string,
): Promise<string | null> {
  const task = await prisma.agendaEventTodoTask.findFirst({
    where: {
      id: taskId,
      event: { agenda: tenantWhere(dispensaryId) },
    },
    select: { event: { select: { agendaId: true } } },
  });
  return task?.event.agendaId ?? null;
}

export async function validateDispensaryUserIds(
  dispensaryId: string,
  userIds: string[],
): Promise<boolean> {
  if (userIds.length === 0) return true;
  const count = await prisma.dispensaryMember.count({
    where: {
      ...tenantWhere(dispensaryId),
      userId: { in: userIds },
    },
  });
  return count === userIds.length;
}

export { resolveAgendaAccess };
