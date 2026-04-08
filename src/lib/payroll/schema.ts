import { z } from 'zod';

const dayScheduleSchema = z.object({
  caisse: z.string().nullable(),
  presence: z.string().nullable(),
});

const scheduleSchema = z.object({
  lundi: dayScheduleSchema,
  mardi: dayScheduleSchema,
  mercredi: dayScheduleSchema,
  jeudi: dayScheduleSchema,
  vendredi: dayScheduleSchema,
  samedi: dayScheduleSchema,
  dimanche: dayScheduleSchema,
});

const employeeStatsSchema = z.object({
  sherifs: z.number().nullable(),
  palefreniers: z.number().nullable(),
  nombre_caisses: z.number().nullable(),
  nombre_presences: z.number().nullable(),
});

export const payrollReportResultSchema = z.object({
  employees: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      id: z.number().nullable(),
      schedule: scheduleSchema,
      stats: employeeStatsSchema,
    }),
  ),
  global_stats: z.object({
    total_employees: z.number(),
    total_caisses: z.number(),
    total_sherifs: z.number(),
    total_palefreniers: z.number().default(0),
  }),
});

export type PayrollReportResult = z.infer<typeof payrollReportResultSchema>;
