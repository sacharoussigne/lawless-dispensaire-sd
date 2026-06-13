export type WeeklyActivityWeekBounds = {
  periodStart: Date;
  periodEnd: Date;
};

export function weeklyActivityWeekKey(bounds: WeeklyActivityWeekBounds): string {
  return `${bounds.periodStart.toISOString()}__${bounds.periodEnd.toISOString()}`;
}

export function isSameWeeklyActivityWeek(
  a: WeeklyActivityWeekBounds,
  b: WeeklyActivityWeekBounds,
): boolean {
  return (
    a.periodStart.getTime() === b.periodStart.getTime() &&
    a.periodEnd.getTime() === b.periodEnd.getTime()
  );
}
