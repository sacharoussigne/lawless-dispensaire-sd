'use server';

import { Prisma } from '@prisma/client';
import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
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
  genericDoctorFallbackName,
  getDiscordAccountIdForUser,
  getLatestDiscordDisplayNames,
  resolveDiscordDisplayName,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { listSerializedWeeklyActivities } from '@/lib/dispensaryWeeklyActivity/listSerialized';
import {
  dispensaryWeeklyActivityCreateSchema,
  dispensaryWeeklyActivityMetricsSchema,
  dispensaryWeeklyActivityUpdateSchema,
} from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  createDispensaryWeeklyActivityWithHistory,
  deleteDispensaryWeeklyActivityWithHistory,
  findWeeklyActivityByDoctorAndPeriod,
  updateDispensaryWeeklyActivityWithHistory,
  WEEKLY_ACTIVITY_DUPLICATE_MESSAGE,
} from '@/lib/dispensaryWeeklyActivity/service';
import { getAppSettings } from '@/lib/appSettings';
import {
  applyVisibilityToCreateInput,
  applyVisibilityToUpdateInput,
  weeklyActivityFieldVisibilityFromSettings,
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

async function requireWeeklyActivityView(dispensarySlug: string) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, {
    feature: 'weeklyDispensaryActivity',
  });
  if (!ctx.ok) {
    return { ok: false as const, response: ctx.response };
  }
  if (!canViewWeeklyDispensaryActivity(ctx.tenant.effectiveRole)) {
    return { ok: false as const, response: { status: 403 as const, error: 'Permission refusée' } };
  }
  return { ok: true as const, session: ctx.session, tenant: ctx.tenant };
}

async function requireWeeklyActivityEdit(dispensarySlug: string) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, {
    feature: 'weeklyDispensaryActivity',
  });
  if (!ctx.ok) {
    return { ok: false as const, response: ctx.response };
  }
  const role = ctx.tenant.effectiveRole;
  const can =
    checkRolePermission(role, 'weekly_dispensary_activity', 'edit_all') ||
    checkRolePermission(role, 'weekly_dispensary_activity', 'edit_own');
  if (!can) {
    return { ok: false as const, response: { status: 403 as const, error: 'Permission refusée' } };
  }
  return { ok: true as const, session: ctx.session, tenant: ctx.tenant };
}

async function listWhereForSession(
  dispensaryId: string,
  sessionUserId: string,
  role: string | null | undefined,
) {
  const tenantFilter = tenantWhere(dispensaryId);
  if (canEditAllWeeklyDispensaryActivity(role)) {
    return tenantFilter;
  }
  const discordId = await getDiscordAccountIdForUser(prisma, sessionUserId);
  const or: { userId?: string; discordUserId?: string }[] = [{ userId: sessionUserId }];
  if (discordId) {
    or.push({ discordUserId: discordId });
  }
  return { ...tenantFilter, OR: or };
}

export async function listDispensaryWeeklyActivities(
  dispensarySlug: string,
  options?: { periodStart: Date; periodEnd: Date },
) {
  try {
    const gate = await requireWeeklyActivityView(dispensarySlug);
    if (!gate.ok) {
      return gate.response;
    }
    const { session, tenant } = gate;
    const { dispensaryId } = tenant;

    const where = await listWhereForSession(dispensaryId, session.user.id, tenant.effectiveRole);

    if (options) {
      Object.assign(where, {
        periodStart: { lte: options.periodEnd },
        periodEnd: { gte: options.periodStart },
      });
    }

    const data = await listSerializedWeeklyActivities(where, dispensaryId);

    return {
      status: 200 as const,
      data,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des activités');
  }
}

const idSchema = z.object({ id: z.string().uuid('ID invalide') });

export async function getDispensaryWeeklyActivityHistory(
  dispensarySlug: string,
  input: z.infer<typeof idSchema>,
) {
  try {
    const gate = await requireWeeklyActivityView(dispensarySlug);
    if (!gate.ok) {
      return gate.response;
    }
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: parsed.error.issues[0]?.message ?? 'ID invalide' };
    }

    const { dispensaryId } = gate.tenant;

    const activity = await prisma.dispensaryWeeklyActivity.findFirst({
      where: { id: parsed.data.id, ...tenantWhere(dispensaryId) },
    });
    if (!activity) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const role = gate.tenant.effectiveRole;
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

    const actorUserIdsWithoutDiscord = [
      ...new Set(
        history
          .filter((h) => h.actorUserId && !h.actorDiscordUserId)
          .map((h) => h.actorUserId as string),
      ),
    ];

    const userIdToDiscordId = new Map<string, string>();
    if (actorUserIdsWithoutDiscord.length > 0) {
      const accounts = await prisma.account.findMany({
        where: {
          userId: { in: actorUserIdsWithoutDiscord },
          providerId: DISCORD_ACCOUNT_PROVIDER_ID,
        },
        select: { userId: true, accountId: true },
      });
      for (const account of accounts) {
        userIdToDiscordId.set(account.userId, account.accountId);
      }
    }

    const actorDiscordIds = new Set<string>();
    for (const h of history) {
      if (h.actorDiscordUserId) {
        actorDiscordIds.add(h.actorDiscordUserId);
        continue;
      }
      if (h.actorUserId) {
        const discordId = userIdToDiscordId.get(h.actorUserId);
        if (discordId) {
          actorDiscordIds.add(discordId);
        }
      }
    }

    const discordIdToName = await getLatestDiscordDisplayNames(prisma, [...actorDiscordIds]);

    return {
      status: 200 as const,
      data: history.map((h) => {
        const actorDiscordUserId =
          h.actorDiscordUserId ??
          (h.actorUserId ? userIdToDiscordId.get(h.actorUserId) ?? null : null);
        const actorResolvedName = actorDiscordUserId
          ? discordIdToName.get(actorDiscordUserId) ?? genericDoctorFallbackName(actorDiscordUserId)
          : null;

        return {
          id: h.id,
          action: h.action,
          source: h.source,
          actorUserName: h.actorUser?.name ?? null,
          actorDiscordUserId,
          actorResolvedName,
          createdAt: h.createdAt.toISOString(),
        };
      }),
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

export async function listDispensaryWeeklyActivityTargets(dispensarySlug: string) {
  try {
    const gate = await requireWeeklyActivityEdit(dispensarySlug);
    if (!gate.ok) {
      return gate.response;
    }
    if (!canEditAllWeeklyDispensaryActivity(gate.tenant.effectiveRole)) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    const users = await prisma.user.findMany({
      where: {
        accounts: {
          some: { providerId: DISCORD_ACCOUNT_PROVIDER_ID },
        },
      },
      select: {
        id: true,
        name: true,
        accounts: {
          where: { providerId: DISCORD_ACCOUNT_PROVIDER_ID },
          select: { accountId: true },
          take: 1,
        },
      },
    });

    const discordUserIds = users
      .map((user) => user.accounts[0]?.accountId)
      .filter((id): id is string => Boolean(id));
    const discordDisplayNames = await getLatestDiscordDisplayNames(prisma, discordUserIds);

    const enriched = users
      .map((user) => {
        const discordUserId = user.accounts[0]?.accountId;
        const discordDisplayName = discordUserId
          ? discordDisplayNames.get(discordUserId) ?? genericDoctorFallbackName(discordUserId)
          : genericDoctorFallbackName('unknown');
        return {
          id: user.id,
          name: user.name,
          discordDisplayName,
        };
      })
      .sort((a, b) =>
        a.discordDisplayName.localeCompare(b.discordDisplayName, 'fr', { sensitivity: 'base' }),
      );

    return { status: 200 as const, data: { users: enriched } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des utilisateurs');
  }
}

export async function createDispensaryWeeklyActivity(
  dispensarySlug: string,
  input: z.infer<typeof createIntranetSchema>,
) {
  try {
    const gate = await requireWeeklyActivityEdit(dispensarySlug);
    if (!gate.ok) {
      return gate.response;
    }
    const parsed = createIntranetSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
    }

    const { session, tenant } = gate;
    const { dispensaryId } = tenant;
    const role = tenant.effectiveRole;
    const editAll = canEditAllWeeklyDispensaryActivity(role);

    let discordUserId: string;
    let displayName: string;
    let resolvedUserId: string | null;
    const actorDiscordUserId = await getDiscordAccountIdForUser(prisma, session.user.id);

    if (!editAll) {
      if (!actorDiscordUserId) {
        return {
          status: 400 as const,
          error: 'Compte Discord requis pour créer une activité (liez Discord dans les paramètres).',
        };
      }
      discordUserId = actorDiscordUserId;
      displayName =
        parsed.data.displayName?.trim() ||
        (await resolveDiscordDisplayName(prisma, actorDiscordUserId));
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
      displayName =
        parsed.data.displayName?.trim() ||
        (await resolveDiscordDisplayName(prisma, targetDiscord));
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

    const settings = await getAppSettings(dispensaryId);
    const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
    const createInput = applyVisibilityToCreateInput(validated.data, visibility);

    const existing = await findWeeklyActivityByDoctorAndPeriod(
      prisma,
      dispensaryId,
      discordUserId,
      parsed.data.periodStart,
    );
    if (existing) {
      return { status: 409 as const, error: WEEKLY_ACTIVITY_DUPLICATE_MESSAGE };
    }

    const created = await createDispensaryWeeklyActivityWithHistory(createInput, {
      source: 'INTRANET',
      actorUserId: session.user.id,
      actorDiscordUserId: actorDiscordUserId ?? null,
      dispensaryId,
    });

    return { status: 200 as const, data: { id: created.id } };
  } catch (error) {
    if (error instanceof Error && error.message === WEEKLY_ACTIVITY_DUPLICATE_MESSAGE) {
      return { status: 409 as const, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { status: 409 as const, error: WEEKLY_ACTIVITY_DUPLICATE_MESSAGE };
    }
    return actionErrorParser(error, 'Erreur lors de la création');
  }
}

export async function updateDispensaryWeeklyActivity(
  dispensarySlug: string,
  input: z.infer<typeof idSchema> & z.infer<typeof dispensaryWeeklyActivityUpdateSchema>,
) {
  try {
    const gate = await requireWeeklyActivityEdit(dispensarySlug);
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

    const { dispensaryId } = gate.tenant;

    const existing = await prisma.dispensaryWeeklyActivity.findFirst({
      where: { id: parsedId.data.id, ...tenantWhere(dispensaryId) },
    });
    if (!existing) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const allowed = await canEditWeeklyActivity(
      prisma,
      gate.session.user.id,
      gate.tenant.effectiveRole,
      existing,
    );
    if (!allowed) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    const settings = await getAppSettings(dispensaryId);
    const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
    const updateInput = applyVisibilityToUpdateInput(parsedBody.data, visibility);
    const actorDiscordUserId = await getDiscordAccountIdForUser(prisma, gate.session.user.id);

    await updateDispensaryWeeklyActivityWithHistory(parsedId.data.id, updateInput, {
      source: 'INTRANET',
      actorUserId: gate.session.user.id,
      actorDiscordUserId: actorDiscordUserId ?? null,
    });

    return { status: 200 as const, data: { ok: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour');
  }
}

export async function deleteDispensaryWeeklyActivity(
  dispensarySlug: string,
  input: z.infer<typeof idSchema>,
) {
  try {
    const gate = await requireWeeklyActivityEdit(dispensarySlug);
    if (!gate.ok) {
      return gate.response;
    }

    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 400 as const, error: 'ID invalide' };
    }

    const { dispensaryId } = gate.tenant;

    const existing = await prisma.dispensaryWeeklyActivity.findFirst({
      where: { id: parsed.data.id, ...tenantWhere(dispensaryId) },
    });
    if (!existing) {
      return { status: 404 as const, error: 'Activité introuvable' };
    }

    const allowed = await canEditWeeklyActivity(
      prisma,
      gate.session.user.id,
      gate.tenant.effectiveRole,
      existing,
    );
    if (!allowed) {
      return { status: 403 as const, error: 'Permission refusée' };
    }

    const actorDiscordUserId = await getDiscordAccountIdForUser(prisma, gate.session.user.id);

    await deleteDispensaryWeeklyActivityWithHistory(parsed.data.id, {
      source: 'INTRANET',
      actorUserId: gate.session.user.id,
      actorDiscordUserId: actorDiscordUserId ?? null,
    });

    return { status: 200 as const, data: { ok: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression');
  }
}
