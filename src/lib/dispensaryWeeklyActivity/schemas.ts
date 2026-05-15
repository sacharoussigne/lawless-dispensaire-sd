import { z } from 'zod';
import { WEEKDAY_KEYS, weekdayFlagsSchema } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

const parisDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Format de date attendu : YYYY-MM-DD',
});

const botDayEditFieldsSchema = z.object({
  weekday: z.enum(WEEKDAY_KEYS).optional(),
  date: parisDateSchema.optional(),
  value: z.boolean().optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
});

function refineBotDayEditExclusive(d: { weekday?: string; date?: string; value?: boolean }) {
  const hasWeekday = d.weekday !== undefined;
  const hasDate = d.date !== undefined;
  const hasValue = d.value !== undefined;
  const isEdit = hasWeekday || hasDate || hasValue;

  if (!isEdit) return true;

  if (hasWeekday && hasDate) {
    return false;
  }
  if (!hasWeekday && !hasDate) {
    return false;
  }
  return hasValue;
}

export const dispensaryWeeklyActivityBotCaisseBodySchema = botDayEditFieldsSchema.refine(
  refineBotDayEditExclusive,
  {
    message:
      'Pour éditer une caisse : indiquez value et exactement un de weekday ou date (pas les deux).',
  },
);

export const dispensaryWeeklyActivityBotPresenceBodySchema = z
  .object({
    day: z.enum(['today', 'yesterday']).optional(),
    weekday: z.enum(WEEKDAY_KEYS).optional(),
    date: parisDateSchema.optional(),
    value: z.boolean().optional(),
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (d) => {
      const legacyDay = d.day !== undefined;
      const hasWeekday = d.weekday !== undefined;
      const hasDate = d.date !== undefined;
      const hasValue = d.value !== undefined;
      const isEdit = hasWeekday || hasDate || hasValue;

      if (legacyDay && isEdit) {
        return false;
      }
      if (legacyDay) {
        return true;
      }
      return refineBotDayEditExclusive(d);
    },
    {
      message:
        'Utilisez day (today/yesterday) seul, ou value avec exactement un de weekday ou date (sans mélanger).',
    },
  );

export const dispensaryWeeklyActivityMetricsSchema = z.object({
  sherifCount: z.number().int().min(0),
  palefrenierCount: z.number().int().min(0),
  patientsCount: z.number().int().min(0),
  infusionsCount: z.number().int().min(0),
  poppyMilkCount: z.number().int().min(0),
  chestDays: weekdayFlagsSchema.optional(),
  presenceDays: weekdayFlagsSchema.optional(),
});

export const dispensaryWeeklyActivityCreateSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    displayName: z.string().trim().min(1).max(200),
    discordUserId: z.string().trim().min(1).max(40),
    userId: z.string().trim().min(1).optional().nullable(),
  })
  .merge(dispensaryWeeklyActivityMetricsSchema)
  .refine((d) => d.periodEnd.getTime() >= d.periodStart.getTime(), {
    message: 'La fin de période doit être après le début',
    path: ['periodEnd'],
  });

export const dispensaryWeeklyActivityUpdateSchema = dispensaryWeeklyActivityMetricsSchema
  .partial()
  .extend({
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (d) => {
      if (d.periodStart !== undefined && d.periodEnd !== undefined) {
        return d.periodEnd.getTime() >= d.periodStart.getTime();
      }
      return true;
    },
    { message: 'La fin de période doit être après le début', path: ['periodEnd'] },
  );

/** Bot `PATCH …/[id]` : counters and meta only (caisse / présence via routes dédiées). */
export const dispensaryWeeklyActivityBotPatchSchema = z
  .object({
    sherifCount: z.number().int().min(0).optional(),
    palefrenierCount: z.number().int().min(0).optional(),
    patientsCount: z.number().int().min(0).optional(),
    infusionsCount: z.number().int().min(0).optional(),
    poppyMilkCount: z.number().int().min(0).optional(),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (d) => {
      if (d.periodStart !== undefined && d.periodEnd !== undefined) {
        return d.periodEnd.getTime() >= d.periodStart.getTime();
      }
      return true;
    },
    { message: 'La fin de période doit être après le début', path: ['periodEnd'] },
  );

export type DispensaryWeeklyActivityBotCaisseBody = z.infer<
  typeof dispensaryWeeklyActivityBotCaisseBodySchema
>;
export type DispensaryWeeklyActivityBotPresenceBody = z.infer<
  typeof dispensaryWeeklyActivityBotPresenceBodySchema
>;

export type DispensaryWeeklyActivityCreateInput = z.infer<typeof dispensaryWeeklyActivityCreateSchema>;
export type DispensaryWeeklyActivityUpdateInput = z.infer<typeof dispensaryWeeklyActivityUpdateSchema>;
export type DispensaryWeeklyActivityBotPatchInput = z.infer<typeof dispensaryWeeklyActivityBotPatchSchema>;
