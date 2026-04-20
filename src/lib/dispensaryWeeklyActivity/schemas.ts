import { z } from 'zod';

export const dispensaryWeeklyActivityMetricsSchema = z.object({
  chestCount: z.number().int().min(0),
  sheriffPatientsCount: z.number().int().min(0),
  patientsCount: z.number().int().min(0),
  infusionsCount: z.number().int().min(0),
  poppyMilkCount: z.number().int().min(0),
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

export type DispensaryWeeklyActivityCreateInput = z.infer<typeof dispensaryWeeklyActivityCreateSchema>;
export type DispensaryWeeklyActivityUpdateInput = z.infer<typeof dispensaryWeeklyActivityUpdateSchema>;
