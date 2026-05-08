/** Default USD reversed to the employee per caisse (stored in report JSON). */
export const PAYROLL_CAISSE_USD = 6.5;

/** Default USD sale price per caisse for the dispensaire (stored in report JSON). */
export const PAYROLL_CAISSE_SALE_USD = 7.5;

/** Default USD per healed patient in employee payout (report JSON). */
export const PAYROLL_PATIENT_CARE_USD = 0.3;

/** Default retail USD per offered item (infusion / poppy milk) in totals, not in virement. */
export const PAYROLL_OFFERED_ITEM_USD = 0.4;

/** Upper bound for payroll amounts (grid, per-employee overrides, supplements). */
export const PAYROLL_MAX_USD = 1_000_000;

export const PAYROLL_REPORT_TYPE_EMPLOYES = 'Employés';
export const PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE = 'Préparateurs de caisse';

export const PAYROLL_REPORT_TYPES = [
  PAYROLL_REPORT_TYPE_EMPLOYES,
  PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
] as const;

export type PayrollReportType = (typeof PAYROLL_REPORT_TYPES)[number];

export function isPayrollReportType(value: string): value is PayrollReportType {
  return (PAYROLL_REPORT_TYPES as readonly string[]).includes(value);
}
