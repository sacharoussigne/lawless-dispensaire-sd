import { endOfDay, endOfWeek, parseISO, startOfWeek } from 'date-fns';

export function weekRangeFromIsoDate(weekReferenceIso: string): { weekStart: Date; weekEnd: Date } {
  const d = parseISO(weekReferenceIso);
  const weekStart = startOfWeek(d, { weekStartsOn: 1 });
  const weekEnd = endOfDay(endOfWeek(d, { weekStartsOn: 1 }));
  return { weekStart, weekEnd };
}
