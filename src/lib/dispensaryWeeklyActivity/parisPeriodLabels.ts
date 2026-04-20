import dayjs from '@/lib/dayjs';

export function formatParisPeriodStartLabel(d: Date): string {
  return dayjs(d).tz('Europe/Paris').locale('fr').format('D MMM');
}

export function formatParisPeriodEndLabel(d: Date): string {
  return dayjs(d).tz('Europe/Paris').locale('fr').format('D MMM YYYY');
}
