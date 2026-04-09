import { describe, expect, it } from 'vitest';
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
    },
    ...overrides,
  };
}

describe('recalculatePayrollResult', () => {
  it('recomputes caisse and presence counts from schedule', () => {
    const data: PayrollReportResult = {
      employees: [
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
      ],
      global_stats: {
        total_employees: 0,
        total_caisses: 0,
        total_sherifs: 0,
        total_palefreniers: 0,
      },
    };

    const out = recalculatePayrollResult(data);
    expect(out.employees[0].stats.nombre_caisses).toBe(2);
    expect(out.employees[0].stats.nombre_presences).toBe(2);
    expect(out.global_stats.total_caisses).toBe(2);
    expect(out.global_stats.total_employees).toBe(1);
  });

  it('aggregates sherifs and palefreniers into global_stats', () => {
    const data: PayrollReportResult = {
      employees: [
        baseEmployee({
          stats: {
            sherifs: 3,
            palefreniers: 2,
            nombre_caisses: 0,
            nombre_presences: 0,
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
          },
        }),
      ],
      global_stats: {
        total_employees: 0,
        total_caisses: 0,
        total_sherifs: 0,
        total_palefreniers: 0,
      },
    };

    const out = recalculatePayrollResult(data);
    expect(out.global_stats.total_sherifs).toBe(4);
    expect(out.global_stats.total_palefreniers).toBe(2);
  });

  it('preserves sherifs and palefreniers on employees', () => {
    const data: PayrollReportResult = {
      employees: [
        baseEmployee({
          stats: {
            sherifs: 5,
            palefreniers: 7,
            nombre_caisses: 1,
            nombre_presences: 1,
          },
        }),
      ],
      global_stats: {
        total_employees: 1,
        total_caisses: 1,
        total_sherifs: 5,
        total_palefreniers: 7,
      },
    };

    const out = recalculatePayrollResult(data);
    expect(out.employees[0].stats.sherifs).toBe(5);
    expect(out.employees[0].stats.palefreniers).toBe(7);
  });
});
