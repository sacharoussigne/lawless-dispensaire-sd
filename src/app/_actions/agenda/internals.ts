import { requireTenantServerActionContext, type AuthSession } from '@/lib/serverActionAuth';
import {
  requireAgendaRead,
  requireAgendaWrite,
  requireAgendaOwner,
  resolveAgendaAccess,
} from '@/lib/agenda/access';
import prisma from '@/lib/prisma';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const agendaUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export type AgendaEligibleUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

function buildAgendaUserSearchFilter(query: string) {
  return {
    name: { contains: query, mode: 'insensitive' as const },
  };
}

export async function searchEligibleDispensaryUsersForAgenda(
  dispensaryId: string,
  query: string,
): Promise<AgendaEligibleUser[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const userFilter = buildAgendaUserSearchFilter(q);

  const [members, matchingUsers] = await Promise.all([
    prisma.dispensaryMember.findMany({
      where: { dispensaryId, user: userFilter },
      include: { user: { select: agendaUserSelect } },
      take: 30,
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.user.findMany({
      where: userFilter,
      select: { ...agendaUserSelect, role: true },
      take: 30,
      orderBy: { name: 'asc' },
    }),
  ]);

  const byId = new Map<string, AgendaEligibleUser>();
  for (const member of members) {
    byId.set(member.user.id, member.user);
  }
  for (const user of matchingUsers) {
    if (!isPlatformAdmin(user.role)) continue;
    byId.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .slice(0, 20);
}

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

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true },
  });
  if (users.length !== userIds.length) return false;

  const memberRequiredIds = users
    .filter((user) => !isPlatformAdmin(user.role))
    .map((user) => user.id);

  if (memberRequiredIds.length === 0) return true;

  const memberCount = await prisma.dispensaryMember.count({
    where: {
      ...tenantWhere(dispensaryId),
      userId: { in: memberRequiredIds },
    },
  });

  return memberCount === memberRequiredIds.length;
}
