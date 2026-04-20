'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import {
  canEditAllWeeklyDispensaryActivity,
  canEditWeeklyActivity,
  canViewWeeklyDispensaryActivity,
  isWeeklyActivityOwner,
} from '@/lib/dispensaryWeeklyActivity/access';
import { DISCORD_ACCOUNT_PROVIDER_ID } from '@/lib/dispensaryWeeklyActivity/constants';
import {
  findLinkedUserIdByDiscordAccount,
  getDiscordAccountIdForUser,
  mergeResolvedDisplayNames,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { serializeDispensaryWeeklyActivityApiRow } from '@/lib/dispensaryWeeklyActivity/apiRow';
import {
  dispensaryWeeklyActivityCreateSchema,
  dispensaryWeeklyActivityMetricsSchema,
  dispensaryWeeklyActivityUpdateSchema,
} from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  createDispensaryWeeklyActivityWithHistory,
  deleteDispensaryWeeklyActivityWithHistory,
  syncActivityUserIdFromDiscordIfMissing,
  updateDispensaryWeeklyActivityWithHistory,
} from '@/lib/dispensaryWeeklyActivity/service';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

async function requireWeeklyActivityView() {
  const session = await getAuthSession();
  if (!session) {
    return { ok: false as const, response: { status: 401 as const, error: 'Non autorisé' } };
  }
  const block = await getAppFeatureActionBlock('weeklyDispensaryActivity');
  if (block) {
    return { ok: false as const, response: block };
  }
  if (!canViewWeeklyDispensaryActivity(session.user?.role)) {
    return { ok: false as const, response: { status: 403 as const, error: 'Permission refusée' } };
  }
  return { ok: true as const, session };
}

async function requireWeeklyActivityEdit() {
  const session = await getAuthSession();
  if (!session) {
    return { ok: false as const, response: { status: 401 as const, error: 'Non autorisé' } };
  }
  const block = await getAppFeatureActionBlock('weeklyDispensaryActivity');
  if (block) {
    return { ok: false as const, response: block };
  }
  const role = session.user?.role;
  const can =
    checkRolePermission(role, 'weekly_dispensary_activity', 'edit_all') ||
    checkRolePermission(role, 'weekly_dispensary_activity', 'edit_own');
  if (!can) {
    return { ok: false as const, response: { status: 403 as const, error: 'Permission refusée' } };
  }
  return { ok: true as const, session };
}

async function listWhereForSession(sessionUserId: string, role: string | null | undefined) {
  if (canEditAllWeeklyDispensaryActivity(role)) {
    return {};
  }
  const discordId = await getDiscordAccountIdForUser(prisma, sessionUserId);
  const or: { userId?: string; discordUserId?: string }[] = [{ userId: sessionUserId }];
  if (discordId) {
    or.push({ discordUserId: discordId });
  }
  return { OR: or };
}

export async function listDispensaryWeeklyActivities() {
  try {
    const gate = await requireWeeklyActivityView();
    if (!gate.ok) {
      return gate.response;
    }
    const { session } = gate;

    const where = await listWhereForSession(session.user.id, session.user.role);

    const rows = await prisma.dispensaryWeeklyActivity.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { periodStart: 'desc' },
    });

    for (const r of rows) {
      if (!r.userId) {
        await syncActivityUserIdFromDiscordIfMissing(prisma, r);
      }
    }

    const refreshed = await prisma.dispensaryWeeklyActivity.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { periodStart: 'desc' },
    });

    const withNames = await mergeResolvedDisplayNames(prisma, refreshed);

    return {
      status: 200 as const,
      data: withNames.map((r) =>
        serializeDispensaryWeeklyActivityApiRow({
          id: r.id,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          displayName: r.displayName,
          resolvedDisplayName: r.resolvedDisplayName,
          discordUserId: r.discordUserId,
          userId: r.userId,
          chestDays: r.chestDays,
          presenceDays: r.presenceDays,
          sherifCount: r.sherifCount,
          patientsCount: r.patientsCount,
          infusionsCount: r.infusionsCount,
          poppyMilkCount: r.poppyMilkCount,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
      ),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des activités');
  }
}

const idSchema = z.object({ id: z.string().uuid('ID invalide') });

export async function getDispensaryWeeklyActivityHistory(input: z.infer<typeof idSchema>) {
  try {
    const gate = await requireWeeklyActivityView();
    if (!gate.ok) {
      return gate.response;
    }
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: parsed.error.issues[0]?.message ?? 'ID invalide' };
    }

    const activity = await prisma.dispensaryWeeklyActivity.findUnique({
      where: { id: parsed.data.id },
    });
    if (!activity) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const role = gate.session.user.role;
    const isAll = canEditAllWeeklyDispensaryActivity(role);
    const own = await isWeeklyActivityOwner(prisma, gate.session.user.id, activity);
    if (!isAll && !own) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    const history = await prisma.dispensaryWeeklyActivityHistory.findMany({
      where: { activityId: parsed.data.id },
      orderBy: { createdAt: 'desc' },
      include: { actorUser: { select: { name: true } } },
    });

    return {
      status: 200 as const,
      data: history.map((h) => ({
        id: h.id,
        action: h.action,
        source: h.source,
        actorUserName: h.actorUser?.name ?? null,
        actorDiscordUserId: h.actorDiscordUserId,
        previousValues: h.previousValues,
        nextValues: h.nextValues,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement de l’historique');
  }
}

const createIntranetSchema = dispensaryWeeklyActivityMetricsSchema
  .merge(
    z.object({
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date(),
      targetUserId: z.string().trim().min(1).max(191).optional(),
      displayName: z.string().trim().min(1).max(200).optional(),
    }),
  )
  .refine((d) => d.periodEnd.getTime() >= d.periodStart.getTime(), {
    message: 'La fin de période doit être après le début',
    path: ['periodEnd'],
  });

export async function listDispensaryWeeklyActivityTargets() {
  try {
    const gate = await requireWeeklyActivityEdit();
    if (!gate.ok) {
      return gate.response;
    }
    if (!canEditAllWeeklyDispensaryActivity(gate.session.user.role)) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    const users = await prisma.user.findMany({
      where: {
        accounts: {
          some: { providerId: DISCORD_ACCOUNT_PROVIDER_ID },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return { status: 200 as const, data: { users } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des utilisateurs');
  }
}

export async function createDispensaryWeeklyActivity(input: z.infer<typeof createIntranetSchema>) {
  try {
    const gate = await requireWeeklyActivityEdit();
    if (!gate.ok) {
      return gate.response;
    }
    const parsed = createIntranetSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
    }

    const { session } = gate;
    const role = session.user.role;
    const editAll = canEditAllWeeklyDispensaryActivity(role);

    let discordUserId: string;
    let displayName: string;
    let resolvedUserId: string | null;

    if (!editAll) {
      const ownDiscord = await getDiscordAccountIdForUser(prisma, session.user.id);
      if (!ownDiscord) {
        return {
          status: 400 as const,
          error: 'Compte Discord requis pour créer une activité (liez Discord dans les paramètres).',
        };
      }
      discordUserId = ownDiscord;
      displayName = session.user.name;
      resolvedUserId = session.user.id;
    } else {
      if (!parsed.data.targetUserId) {
        return { status: 400 as const, error: 'Sélectionnez un médecin' };
      }
      const target = await prisma.user.findUnique({
        where: { id: parsed.data.targetUserId },
        select: { id: true, name: true },
      });
      if (!target) {
        return { status: 400 as const, error: 'Utilisateur introuvable' };
      }
      const targetDiscord = await getDiscordAccountIdForUser(prisma, target.id);
      if (!targetDiscord) {
        return {
          status: 400 as const,
          error: 'Ce compte intranet n’a pas de Discord lié.',
        };
      }
      discordUserId = targetDiscord;
      displayName = (parsed.data.displayName?.trim() || target.name).trim();
      resolvedUserId = target.id;
    }

    const linked = await findLinkedUserIdByDiscordAccount(prisma, discordUserId);
    const userIdForRow = resolvedUserId ?? linked ?? null;

    const validated = dispensaryWeeklyActivityCreateSchema.safeParse({
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      displayName,
      discordUserId,
      userId: userIdForRow,
      chestDays: parsed.data.chestDays,
      presenceDays: parsed.data.presenceDays,
      sherifCount: parsed.data.sherifCount,
      patientsCount: parsed.data.patientsCount,
      infusionsCount: parsed.data.infusionsCount,
      poppyMilkCount: parsed.data.poppyMilkCount,
    });
    if (!validated.success) {
      return { status: 400 as const, error: validated.error.issues[0]?.message ?? 'Données invalides' };
    }

    const created = await createDispensaryWeeklyActivityWithHistory(validated.data, {
      source: 'INTRANET',
      actorUserId: session.user.id,
      actorDiscordUserId: (await getDiscordAccountIdForUser(prisma, session.user.id)) ?? null,
    });

    return { status: 200 as const, data: { id: created.id } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création');
  }
}

export async function updateDispensaryWeeklyActivity(
  input: z.infer<typeof idSchema> & z.infer<typeof dispensaryWeeklyActivityUpdateSchema>,
) {
  try {
    const gate = await requireWeeklyActivityEdit();
    if (!gate.ok) {
      return gate.response;
    }

    const parsedId = idSchema.safeParse({ id: input.id });
    if (!parsedId.success) {
      return { status: 400 as const, error: 'ID invalide' };
    }

    const body = { ...input };
    delete (body as { id?: string }).id;
    const parsedBody = dispensaryWeeklyActivityUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return { status: 400 as const, error: parsedBody.error.issues[0]?.message ?? 'Données invalides' };
    }

    const existing = await prisma.dispensaryWeeklyActivity.findUnique({
      where: { id: parsedId.data.id },
    });
    if (!existing) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const allowed = await canEditWeeklyActivity(
      prisma,
      gate.session.user.id,
      gate.session.user.role,
      existing,
    );
    if (!allowed) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    await updateDispensaryWeeklyActivityWithHistory(parsedId.data.id, parsedBody.data, {
      source: 'INTRANET',
      actorUserId: gate.session.user.id,
      actorDiscordUserId: (await getDiscordAccountIdForUser(prisma, gate.session.user.id)) ?? null,
    });

    return { status: 200 as const, data: { ok: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour');
  }
}

export async function deleteDispensaryWeeklyActivity(input: z.infer<typeof idSchema>) {
  try {
    const gate = await requireWeeklyActivityEdit();
    if (!gate.ok) {
      return gate.response;
    }

    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: 'ID invalide' };
    }

    const existing = await prisma.dispensaryWeeklyActivity.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const allowed = await canEditWeeklyActivity(
      prisma,
      gate.session.user.id,
      gate.session.user.role,
      existing,
    );
    if (!allowed) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    await deleteDispensaryWeeklyActivityWithHistory(parsed.data.id, {
      source: 'INTRANET',
      actorUserId: gate.session.user.id,
      actorDiscordUserId: (await getDiscordAccountIdForUser(prisma, gate.session.user.id)) ?? null,
    });

    return { status: 200 as const, data: { ok: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression');
  }
}
