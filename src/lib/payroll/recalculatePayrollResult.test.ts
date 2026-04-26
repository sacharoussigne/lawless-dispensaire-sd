import { describe, expect, it } from 'vitest';
import {
  PAYROLL_CAISSE_SALE_USD,
  PAYROLL_CAISSE_USD,
  PAYROLL_OFFERED_ITEM_USD,
  PAYROLL_PATIENT_CARE_USD,
} from './constants';
import type { PayrollReportResult } from './schema';
import { recalculatePayrollResult } from './recalculatePayrollResult';

const emptyDay = { caisse: null as string | null, presence: null as string | null };

function baseEmployee(
  overrides: Partial<PayrollReportResult['employees'][number]> = {},
): PayrollReportResult['employees'][number] {
  return {
    name: 'Test',
    role: 'Médecin',
    id: 1,
    schedule: {
      lundi: { ...emptyDay },
      mardi: { ...emptyDay },
      mercredi: { ...emptyDay },
      jeudi: { ...emptyDay },
      vendredi: { ...emptyDay },
      samedi: { ...emptyDay },
      dimanche: { ...emptyDay },
    },
    stats: {
      sherifs: null,
      palefreniers: null,
      nombre_caisses: 99,
      nombre_presences: 99,
      patients_soignes: 0,
      poppy_milk_offertes: 0,
      infusions_ginseng_offertes: 0,
    },
    ...overrides,
  };
}

function baseReport(
  employees: PayrollReportResult['employees'],
  overrides: Partial<
    Pick<
      PayrollReportResult,
      | 'caisse_price_usd'
      | 'caisse_sale_price_usd'
      | 'patient_care_price_usd'
      | 'offered_item_price_usd'
      | 'global_stats'
    >
  > = {},
): PayrollReportResult {
  return {
    caisse_price_usd: PAYROLL_CAISSE_USD,
    caisse_sale_price_usd: PAYROLL_CAISSE_SALE_USD,
    patient_care_price_usd: PAYROLL_PATIENT_CARE_USD,
    offered_item_price_usd: PAYROLL_OFFERED_ITEM_USD,
    employees,
    global_stats: {
      total_employees: 0,
      total_caisses: 0,
      total_sherifs: 0,
      total_palefreniers: 0,
      total_benefit_usd: 0,
      total_patients_soignes: 0,
      total_offered_item_count: 0,
      total_employee_payout_usd: 0,
      total_offered_retail_value_usd: 0,
      total_monetary_including_offers_usd: 0,
    },
    ...overrides,
  };
}

describe('recalculatePayrollResult', () => {
  it('recomputes caisse and presence counts from schedule', () => {
    const data = baseReport([
      baseEmployee({
        schedule: {
          lundi: { caisse: 'X', presence: null },
          mardi: { caisse: null, presence: 'P' },
          mercredi: { caisse: 'X', presence: 'P' },
          jeudi: { ...emptyDay },
          vendredi: { ...emptyDay },
          samedi: { ...emptyDay },
          dimanche: { ...emptyDay },
        },
      }),
    ]);

    const out = recalculatePayrollResult(data);
    expect(out.employees[0].stats.nombre_caisses).toBe(2);
    expect(out.employees[0].stats.nombre_presences).toBe(2);
    expect(out.global_stats.total_caisses).toBe(2);
    expect(out.global_stats.total_employees).toBe(1);
  });

  it('aggregates sherifs and palefreniers into global_stats', () => {
    const data = baseReport([
      baseEmployee({
        stats: {
          sherifs: 3,
          palefreniers: 2,
          nombre_caisses: 0,
          nombre_presences: 0,
          patients_soignes: 0,
          poppy_milk_offertes: 0,
          infusions_ginseng_offertes: 0,
        },
      }),
      baseEmployee({
        name: 'B',
        id: 2,
        stats: {
          sherifs: 1,
          palefreniers: null,
          nombre_caisses: 0,
          nombre_presences: 0,
          patients_soignes: 0,
          poppy_milk_offertes: 0,
          infusions_ginseng_offertes: 0,
        },
      }),
    ]);

    const out = recalculatePayrollResult(data);
    expect(out.global_stats.total_sherifs).toBe(4);
    expect(out.global_stats.total_palefreniers).toBe(2);
  });

  it('preserves sherifs and palefreniers on employees', () => {
    const data = baseReport([
      baseEmployee({
        stats: {
          sherifs: 5,
          palefreniers: 7,
          nombre_caisses: 1,
          nombre_presences: 1,
          patients_soignes: 0,
          poppy_milk_offertes: 0,
          infusions_ginseng_offertes: 0,
        },
      }),
    ]);

    const out = recalculatePayrollResult(data);
    expect(out.employees[0].stats.sherifs).toBe(5);
    expect(out.employees[0].stats.palefreniers).toBe(7);
  });

  it('preserves caisse_price_usd on the report', () => {
    const data = baseReport([baseEmployee(), baseEmployee({ name: 'B', id: 2 })], {
      caisse_price_usd: 8.25,
    });

    const out = recalculatePayrollResult(data);
    expect(out.caisse_price_usd).toBe(8.25);
  });

  it('preserves caisse_sale_price_usd on the report', () => {
    const data = baseReport([baseEmployee()], { caisse_sale_price_usd: 9 });

    const out = recalculatePayrollResult(data);
    expect(out.caisse_sale_price_usd).toBe(9);
  });

  it('computes total_benefit_usd from sale minus employee payout per caisse', () => {
    const data = baseReport(
      [
        baseEmployee({
          stats: {
            sherifs: null,
            palefreniers: null,
            nombre_caisses: 3,
            nombre_presences: 0,
            patients_soignes: 0,
            poppy_milk_offertes: 0,
            infusions_ginseng_offertes: 0,
          },
          schedule: {
            lundi: { caisse: 'X', presence: null },
            mardi: { caisse: 'X', presence: null },
            mercredi: { caisse: 'X', presence: null },
            jeudi: { ...emptyDay },
            vendredi: { ...emptyDay },
            samedi: { ...emptyDay },
            dimanche: { ...emptyDay },
          },
        }),
      ],
      { caisse_sale_price_usd: 7.5, caisse_price_usd: 6.5 },
    );

    const out = recalculatePayrollResult(data);
    expect(out.global_stats.total_caisses).toBe(3);
    expect(out.global_stats.total_benefit_usd).toBeCloseTo(3, 5);
  });

  it('includes patient bonus in total_employee_payout_usd', () => {
    const data = baseReport(
      [
        baseEmployee({
          stats: {
            sherifs: null,
            palefreniers: null,
            nombre_caisses: 2,
            nombre_presences: 0,
            patients_soignes: 10,
            poppy_milk_offertes: 0,
            infusions_ginseng_offertes: 0,
          },
          schedule: {
            lundi: { caisse: 'X', presence: null },
            mardi: { caisse: 'X', presence: null },
            mercredi: { ...emptyDay },
            jeudi: { ...emptyDay },
            vendredi: { ...emptyDay },
            samedi: { ...emptyDay },
            dimanche: { ...emptyDay },
          },
        }),
      ],
      { caisse_price_usd: 6, patient_care_price_usd: 0.3 },
    );
    const out = recalculatePayrollResult(data);
    expect(out.global_stats.total_employee_payout_usd).toBeCloseTo(2 * 6 + 10 * 0.3, 5);
    expect(out.global_stats.total_patients_soignes).toBe(10);
  });
});
