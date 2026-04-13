import type { PayrollReportResult } from './schema';

const SCHEDULE_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

function countSchedule(schedule: PayrollReportResult['employees'][number]['schedule']) {
  let nombre_caisses = 0;
  let nombre_presences = 0;
  for (const day of SCHEDULE_DAYS) {
    if (schedule[day].caisse === 'X') nombre_caisses++;
    if (schedule[day].presence === 'P') nombre_presences++;
  }
  return { nombre_caisses, nombre_presences };
}

export function recalculatePayrollResult(data: PayrollReportResult): PayrollReportResult {
  const employees = data.employees.map((emp) => {
    const { nombre_caisses, nombre_presences } = countSchedule(emp.schedule);
    return {
      ...emp,
      stats: {
        ...emp.stats,
        nombre_caisses,
        nombre_presences,
      },
    };
  });

  const unitBenefitUsd = data.caisse_sale_price_usd - data.caisse_price_usd;
  const global_stats = {
    total_employees: employees.length,
    total_caisses: employees.reduce((sum, e) => sum + e.stats.nombre_caisses, 0),
    total_sherifs: employees.reduce((sum, e) => sum + (e.stats.sherifs ?? 0), 0),
    total_palefreniers: employees.reduce((sum, e) => sum + (e.stats.palefreniers ?? 0), 0),
    total_benefit_usd: employees.reduce(
      (sum, e) => sum + e.stats.nombre_caisses * unitBenefitUsd,
      0,
    ),
  };

  return { ...data, employees, global_stats };
}
