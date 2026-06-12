import { format, getISOWeek, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PAYROLL_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

export type PayrollDay = (typeof PAYROLL_DAYS)[number];

export const CAISSE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'X', label: 'X' },
] as const;

export const PRESENCE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'P', label: 'P' },
] as const;

export const BANDAGE_EXPORT_DEPOSIT_MOTIF = "Caisse d'exportation Bandage";

/** Display-only: RP calendar is 136 years before real dates (DB unchanged). */
export const PAYROLL_RP_DISPLAY_YEAR_OFFSET = 136;

export function payrollRpDisplayDate(d: Date): Date {
  return subYears(d, PAYROLL_RP_DISPLAY_YEAR_OFFSET);
}

export function wireTransferDescription(weekStart: Date, weekEnd: Date): string {
  const displayStart = payrollRpDisplayDate(weekStart);
  const displayEnd = payrollRpDisplayDate(weekEnd);
  return `Salaire Semaine ${format(displayStart, 'dd MMMM yyyy', { locale: fr })} au ${format(displayEnd, 'dd MMMM yyyy', { locale: fr })} - N°${getISOWeek(weekStart)}`;
}
