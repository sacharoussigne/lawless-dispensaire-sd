/**
 * Utility functions for date management
 * Uses dayjs configured with Europe/Paris timezone by default
 */

import dayjs from '@/lib/dayjs';

/**
 * Gets the current date
 */
export function getNow(): Date {
  return dayjs.tz().toDate();
}

/**
 * Gets the start of the day (00:00:00) for a given date
 */
export function getStartOfDay(date?: Date): Date {
  return dayjs(date).tz().startOf('day').toDate();
}

/**
 * Gets the start of today
 */
export function getTodayStart(): Date {
  return dayjs.tz().startOf('day').toDate();
}

/**
 * Gets the start of yesterday
 */
export function getYesterdayStart(): Date {
  return dayjs.tz().subtract(1, 'day').startOf('day').toDate();
}

/**
 * Gets the start of tomorrow
 */
export function getTomorrowStart(): Date {
  return dayjs.tz().add(1, 'day').startOf('day').toDate();
}

/** Start of Monday of the current week (ISO week, Paris timezone). */
export function getMondayOfCurrentWeek(): Date {
  return dayjs.tz().startOf('isoWeek').toDate();
}

/** End of range for stats: start of day after `to` (exclusive upper bound). */
export function getDayAfter(date: Date): Date {
  return dayjs(date).tz().add(1, 'day').startOf('day').toDate();
}

/**
 * Converts a date to formatted string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return dayjs(date).tz().format('YYYY-MM-DD');
}

/**
 * Checks if a date is within a day range
 * Dates are compared by their day, not their UTC time
 */
export function isDateInDayRange(date: Date, dayStart: Date, dayEnd: Date): boolean {
  // Convert dates to YYYY-MM-DD format for day comparison
  const dateStr = formatDate(date);
  const dayStartStr = formatDate(dayStart);
  const dayEndStr = formatDate(dayEnd);
  
  // If date is between start and end (exclusive) of the day
  return dateStr >= dayStartStr && dateStr < dayEndStr;
}

