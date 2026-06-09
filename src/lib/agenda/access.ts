import type { AgendaAccessLevel } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/permissions';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { Role } from '@/types/enum/roles';
import {
  canOwnAgenda,
  canReadAgenda,
  canWriteAgenda,
} from '@/types/agenda';

export type AgendaAccessResult =
  | { ok: true; accessLevel: AgendaAccessLevel | null; isDispensaryAdmin: boolean }
  | { ok: false; status: number; error: string };

export function isDispensaryAdminRole(
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): boolean {
  return isPlatformAdmin(platformRole) || hasRole(effectiveRole, Role.ADMIN);
}

export async function resolveAgendaAccess(
  dispensaryId: string,
  agendaId: string,
  userId: string,
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): Promise<AgendaAccessResult> {
  const agenda = await prisma.agenda.findFirst({
    where: { id: agendaId, ...tenantWhere(dispensaryId) },
    select: { id: true },
  });

  if (!agenda) {
    return { ok: false, status: 404, error: 'Agenda introuvable' };
  }

  const membership = await prisma.agendaMember.findUnique({
    where: { agendaId_userId: { agendaId, userId } },
    select: { accessLevel: true },
  });

  if (!membership) {
    return { ok: false, status: 403, error: 'Accès non autorisé à cet agenda' };
  }

  return {
    ok: true,
    accessLevel: membership.accessLevel,
    isDispensaryAdmin: isDispensaryAdminRole(platformRole, effectiveRole),
  };
}

export async function requireAgendaRead(
  dispensaryId: string,
  agendaId: string,
  userId: string,
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): Promise<AgendaAccessResult> {
  const access = await resolveAgendaAccess(
    dispensaryId,
    agendaId,
    userId,
    platformRole,
    effectiveRole,
  );
  if (!access.ok) return access;

  if (!canReadAgenda(access.accessLevel)) {
    return { ok: false, status: 403, error: 'Accès lecture requis' };
  }

  return access;
}

export async function requireAgendaWrite(
  dispensaryId: string,
  agendaId: string,
  userId: string,
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): Promise<AgendaAccessResult> {
  const access = await resolveAgendaAccess(
    dispensaryId,
    agendaId,
    userId,
    platformRole,
    effectiveRole,
  );
  if (!access.ok) return access;

  if (!canWriteAgenda(access.accessLevel)) {
    return { ok: false, status: 403, error: 'Accès écriture requis' };
  }

  return access;
}

export async function requireAgendaOwner(
  dispensaryId: string,
  agendaId: string,
  userId: string,
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): Promise<AgendaAccessResult> {
  const access = await resolveAgendaAccess(
    dispensaryId,
    agendaId,
    userId,
    platformRole,
    effectiveRole,
  );
  if (!access.ok) return access;

  if (!canOwnAgenda(access.accessLevel)) {
    return { ok: false, status: 403, error: 'Droits propriétaire requis' };
  }

  return access;
}

export async function canManageAgendaMembers(
  dispensaryId: string,
  agendaId: string,
  userId: string,
  platformRole: string | null | undefined,
  effectiveRole: string | null | undefined,
): Promise<boolean> {
  if (isDispensaryAdminRole(platformRole, effectiveRole)) {
    return true;
  }

  const membership = await prisma.agendaMember.findUnique({
    where: { agendaId_userId: { agendaId, userId } },
    select: { accessLevel: true },
  });

  return canOwnAgenda(membership?.accessLevel);
}

export async function listAccessibleAgendaIds(
  dispensaryId: string,
  userId: string,
  _platformRole?: string | null | undefined,
  _effectiveRole?: string | null | undefined,
): Promise<string[]> {
  const memberships = await prisma.agendaMember.findMany({
    where: {
      userId,
      agenda: tenantWhere(dispensaryId),
    },
    select: { agendaId: true },
  });

  return memberships.map((m) => m.agendaId);
}

export async function userHasAnyAgendaAccess(
  dispensaryId: string,
  userId: string,
  _platformRole?: string | null | undefined,
  _effectiveRole?: string | null | undefined,
): Promise<boolean> {
  const membershipCount = await prisma.agendaMember.count({
    where: {
      userId,
      agenda: tenantWhere(dispensaryId),
    },
  });

  if (membershipCount > 0) {
    return true;
  }

  const participantCount = await prisma.agendaEventParticipant.count({
    where: {
      userId,
      event: { agenda: tenantWhere(dispensaryId) },
    },
  });

  return participantCount > 0;
}
