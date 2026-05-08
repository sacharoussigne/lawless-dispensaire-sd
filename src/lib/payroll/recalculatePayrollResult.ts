import type { PayrollReportResult } from './schema';

export function effectiveCaisseUnitUsd(
  emp: PayrollReportResult['employees'][number],
  reportCaisseUsd: number,
): number {
  return emp.caisse_unit_override_usd ?? reportCaisseUsd;
}

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

  const total_employee_payout_usd = employees.reduce((sum, e) => {
    const ca = e.stats.nombre_caisses ?? 0;
    const p = e.stats.patients_soignes ?? 0;
    const unit = effectiveCaisseUnitUsd(e, data.caisse_price_usd);
    const supplement = e.salary_supplement_usd ?? 0;
    return sum + ca * unit + p * data.patient_care_price_usd + supplement;
  }, 0);

  const total_offered_item_count = employees.reduce(
    (sum, e) =>
      sum + (e.stats.poppy_milk_offertes ?? 0) + (e.stats.infusions_ginseng_offertes ?? 0),
    0,
  );
  const total_offered_retail_value_usd = total_offered_item_count * data.offered_item_price_usd;
  const total_patients_soignes = employees.reduce((s, e) => s + (e.stats.patients_soignes ?? 0), 0);

  const global_stats = {
    total_employees: employees.length,
    total_caisses: employees.reduce((sum, e) => sum + (e.stats.nombre_caisses ?? 0), 0),
    total_sherifs: employees.reduce((sum, e) => sum + (e.stats.sherifs ?? 0), 0),
    total_palefreniers: employees.reduce((sum, e) => sum + (e.stats.palefreniers ?? 0), 0),
    total_benefit_usd: employees.reduce((sum, e) => {
      const ca = e.stats.nombre_caisses ?? 0;
      const unit = effectiveCaisseUnitUsd(e, data.caisse_price_usd);
      return sum + ca * (data.caisse_sale_price_usd - unit);
    }, 0),
    total_patients_soignes,
    total_offered_item_count,
    total_employee_payout_usd,
    total_offered_retail_value_usd,
  };

  return { ...data, employees, global_stats };
}
