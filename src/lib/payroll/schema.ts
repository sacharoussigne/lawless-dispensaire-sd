import { z } from 'zod';
import {
  PAYROLL_CAISSE_SALE_USD,
  PAYROLL_CAISSE_USD,
  PAYROLL_OFFERED_ITEM_USD,
  PAYROLL_PATIENT_CARE_USD,
} from './constants';

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
  patients_soignes: z.number().int().min(0).default(0),
  poppy_milk_offertes: z.number().int().min(0).default(0),
  infusions_ginseng_offertes: z.number().int().min(0).default(0),
});

const employeeSchema = z.object({
  name: z.string(),
  role: z.string(),
  id: z.number().nullable(),
  schedule: scheduleSchema,
  stats: employeeStatsSchema,
});

const weeklyActivityImportSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
});

const payrollReportResultInnerSchema = z.object({
  caisse_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_CAISSE_USD),
  caisse_sale_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_CAISSE_SALE_USD),
  patient_care_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_PATIENT_CARE_USD),
  offered_item_price_usd: z.number().positive().max(1_000_000).default(PAYROLL_OFFERED_ITEM_USD),
  weekly_activity_import: weeklyActivityImportSchema.nullable().optional(),
  employees: z.array(employeeSchema),
  global_stats: z.object({
    total_employees: z.number(),
    total_caisses: z.number(),
    total_sherifs: z.number(),
    total_palefreniers: z.number().default(0),
    total_benefit_usd: z.number().default(0),
    total_patients_soignes: z.number().default(0),
    total_offered_item_count: z.number().default(0),
    total_employee_payout_usd: z.number().default(0),
    total_offered_retail_value_usd: z.number().default(0),
    total_monetary_including_offers_usd: z.number().default(0),
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

  let patient_care_price_usd = o.patient_care_price_usd;
  if (
    patient_care_price_usd === undefined ||
    patient_care_price_usd === null ||
    (typeof patient_care_price_usd === 'number' &&
      (!Number.isFinite(patient_care_price_usd) || patient_care_price_usd <= 0))
  ) {
    patient_care_price_usd = PAYROLL_PATIENT_CARE_USD;
  }

  let offered_item_price_usd = o.offered_item_price_usd;
  if (
    offered_item_price_usd === undefined ||
    offered_item_price_usd === null ||
    (typeof offered_item_price_usd === 'number' &&
      (!Number.isFinite(offered_item_price_usd) || offered_item_price_usd <= 0))
  ) {
    offered_item_price_usd = PAYROLL_OFFERED_ITEM_USD;
  }

  return {
    ...o,
    caisse_price_usd: resolvedCaissePrice,
    caisse_sale_price_usd,
    patient_care_price_usd,
    offered_item_price_usd,
    employees,
  };
}

export const payrollReportResultSchema = z.preprocess(
  normalizePayrollReportResultRaw,
  payrollReportResultInnerSchema,
);

export type PayrollReportResult = z.infer<typeof payrollReportResultInnerSchema>;
