import { z } from 'zod';
import { weekdayFlagsSchema } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

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

export const dispensaryWeeklyActivityBotCaisseBodySchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const dispensaryWeeklyActivityBotPresenceBodySchema = z.object({
  day: z.enum(['today', 'yesterday']),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export type DispensaryWeeklyActivityCreateInput = z.infer<typeof dispensaryWeeklyActivityCreateSchema>;
export type DispensaryWeeklyActivityUpdateInput = z.infer<typeof dispensaryWeeklyActivityUpdateSchema>;
export type DispensaryWeeklyActivityBotPatchInput = z.infer<typeof dispensaryWeeklyActivityBotPatchSchema>;
