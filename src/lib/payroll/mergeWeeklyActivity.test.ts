import { describe, expect, it } from 'vitest';
import type { DispensaryWeeklyActivity } from '@prisma/client';
import { mergeHtmlAndWeeklyActivity, mergeScheduleOr, payrollNameKey } from '@/lib/payroll/mergeWeeklyActivity';
import type { ParsedPayrollTable } from '@/lib/payroll/parsePayrollHtmlTable';
import { PAYROLL_DAYS } from '@/lib/payroll/parsePayrollHtmlTable';

const emptyDay = { caisse: null as string | null, presence: null as string | null };

function row(
  overrides: Partial<DispensaryWeeklyActivity> & {
    resolvedDisplayName: string;
    user?: { name: string } | null;
  },
): Parameters<typeof mergeHtmlAndWeeklyActivity>[1][number] {
  return {
    id: 'wa-1',
    dispensaryId: 'dispensary-1',
    periodStart: new Date(),
    periodEnd: new Date(),
    displayName: 'Test',
    discordUserId: '1',
    userId: null,
    chestDays: {},
    presenceDays: {},
    sherifCount: 0,
    patientsCount: 0,
    infusionsCount: 0,
    poppyMilkCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
    ...overrides,
  };
}

describe('mergeHtmlAndWeeklyActivity', () => {
  it('merges patients with max(table, weekly)', () => {
    const schedule = Object.fromEntries(PAYROLL_DAYS.map((d) => [d, { ...emptyDay }])) as ParsedPayrollTable['employees'][0]['schedule'];
    const parsed: ParsedPayrollTable = {
      employees: [
        {
          name: 'Alice',
          role: 'Médecin',
          id: 1,
          schedule,
          stats: {
            sherifs: null,
            palefreniers: null,
            patients_soignes: 5,
            nombre_caisses: 0,
            nombre_presences: 0,
          },
        },
      ],
      global_stats: { total_employees: 1, total_caisses: 0, total_sherifs: 0, total_palefreniers: 0 },
    };
    const wa = [
      row({
        resolvedDisplayName: 'Alice',
        displayName: 'Alice',
        patientsCount: 0,
      }),
    ];
    const out = mergeHtmlAndWeeklyActivity(parsed, wa);
    expect(out[0].stats.patients_soignes).toBe(5);
  });

  it('adds weekly-only employees', () => {
    const parsed: ParsedPayrollTable = {
      employees: [],
      global_stats: { total_employees: 0, total_caisses: 0, total_sherifs: 0, total_palefreniers: 0 },
    };
    const wa = [
      row({
        id: 'w2',
        resolvedDisplayName: 'Bob',
        displayName: 'Bob',
        patientsCount: 3,
        poppyMilkCount: 1,
        infusionsCount: 2,
      }),
    ];
    const out = mergeHtmlAndWeeklyActivity(parsed, wa);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Bob');
    expect(out[0].stats.patients_soignes).toBe(3);
    expect(out[0].stats.poppy_milk_offertes).toBe(1);
    expect(out[0].stats.infusions_ginseng_offertes).toBe(2);
  });

  it('does not match weekly activity via intranet user name', () => {
    const schedule = Object.fromEntries(PAYROLL_DAYS.map((d) => [d, { ...emptyDay }])) as ParsedPayrollTable['employees'][0]['schedule'];
    const parsed: ParsedPayrollTable = {
      employees: [
        {
          name: 'IntranetOnly',
          role: 'Médecin',
          id: 1,
          schedule,
          stats: {
            sherifs: null,
            palefreniers: null,
            patients_soignes: 0,
            nombre_caisses: 0,
            nombre_presences: 0,
          },
        },
      ],
      global_stats: { total_employees: 1, total_caisses: 0, total_sherifs: 0, total_palefreniers: 0 },
    };
    const wa = [
      row({
        resolvedDisplayName: 'DiscordPseudo',
        displayName: 'DiscordPseudo',
        user: { name: 'IntranetOnly' },
        patientsCount: 4,
      }),
    ];
    const out = mergeHtmlAndWeeklyActivity(parsed, wa);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('IntranetOnly');
    expect(out[0].stats.patients_soignes).toBe(0);
    expect(out[1].name).toBe('DiscordPseudo');
    expect(out[1].stats.patients_soignes).toBe(4);
  });
});

describe('mergeScheduleOr', () => {
  it('ORs caisse and presence flags', () => {
    const a = Object.fromEntries(PAYROLL_DAYS.map((d) => [d, { ...emptyDay }])) as import('@/lib/payroll/schema').PayrollReportResult['employees'][number]['schedule'];
    a.lundi = { caisse: 'X', presence: null };
    const b = Object.fromEntries(PAYROLL_DAYS.map((d) => [d, { ...emptyDay }])) as import('@/lib/payroll/schema').PayrollReportResult['employees'][number]['schedule'];
    b.lundi = { caisse: null, presence: 'P' };
    const m = mergeScheduleOr(a, b);
    expect(m.lundi.caisse).toBe('X');
    expect(m.lundi.presence).toBe('P');
  });
});

describe('payrollNameKey', () => {
  it('normalizes accents and case', () => {
    expect(payrollNameKey(' Héloïse  ')).toBe('heloise');
  });
});
