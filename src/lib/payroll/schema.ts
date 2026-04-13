import { z } from 'zod';
import { PAYROLL_CAISSE_SALE_USD, PAYROLL_CAISSE_USD } from './constants';

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

const employeeSchema = z.object({
  name: z.string(),
  role: z.string(),
  id: z.number().nullable(),
  schedule: scheduleSchema,
  stats: employeeStatsSchema,
});

const payrollReportResultInnerSchema = z.object({
  caisse_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_CAISSE_USD),
  caisse_sale_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_CAISSE_SALE_USD),
  employees: z.array(employeeSchema),
  global_stats: z.object({
    total_employees: z.number(),
    total_caisses: z.number(),
    total_sherifs: z.number(),
    total_palefreniers: z.number().default(0),
    total_benefit_usd: z.number().default(0),
  }),
});

/** Migrates legacy JSON where `caisse_price_usd` lived on each employee. */
export function normalizePayrollReportResultRaw(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  let caisse_price_usd = o.caisse_price_usd;
  const emps = o.employees;

  if (
    (caisse_price_usd === undefined || caisse_price_usd === null) &&
    Array.isArray(emps)
  ) {
    for (const e of emps) {
      if (e && typeof e === 'object' && 'caisse_price_usd' in e) {
        const p = (e as { caisse_price_usd?: unknown }).caisse_price_usd;
        if (typeof p === 'number' && Number.isFinite(p) && p > 0) {
          caisse_price_usd = p;
          break;
        }
      }
    }
  }

  const employees = Array.isArray(emps)
    ? emps.map((e) => {
        if (!e || typeof e !== 'object') return e;
        const rest = { ...(e as Record<string, unknown>) };
        delete rest.caisse_price_usd;
        return rest;
      })
    : emps;

  const resolvedCaissePrice =
    typeof caisse_price_usd === 'number' &&
    Number.isFinite(caisse_price_usd) &&
    caisse_price_usd > 0
      ? caisse_price_usd
      : PAYROLL_CAISSE_USD;

  let caisse_sale_price_usd = o.caisse_sale_price_usd;
  if (
    caisse_sale_price_usd === undefined ||
    caisse_sale_price_usd === null ||
    (typeof caisse_sale_price_usd === 'number' &&
      (!Number.isFinite(caisse_sale_price_usd) || caisse_sale_price_usd <= 0))
  ) {
    caisse_sale_price_usd = PAYROLL_CAISSE_SALE_USD;
  }

  return {
    ...o,
    caisse_price_usd: resolvedCaissePrice,
    caisse_sale_price_usd,
    employees,
  };
}

export const payrollReportResultSchema = z.preprocess(
  normalizePayrollReportResultRaw,
  payrollReportResultInnerSchema,
);

export type PayrollReportResult = z.infer<typeof payrollReportResultInnerSchema>;
