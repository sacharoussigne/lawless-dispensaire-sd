/**
 * Fonctions utilitaires pour gérer les dates
 * Utilise dayjs configuré avec le fuseau horaire Europe/Paris par défaut
 */

import dayjs from '@/lib/dayjs';

/**
 * Obtient la date actuelle
 */
export function getNow(): Date {
  return dayjs.tz().toDate();
}

/**
 * Obtient le début de la journée (00:00:00) pour une date donnée
 */
export function getStartOfDay(date?: Date): Date {
  return dayjs(date).tz().startOf('day').toDate();
}

/**
 * Obtient le début de la journée d'aujourd'hui
 */
export function getTodayStart(): Date {
  return dayjs.tz().startOf('day').toDate();
}

/**
 * Obtient le début de la journée d'hier
 */
export function getYesterdayStart(): Date {
  return dayjs.tz().subtract(1, 'day').startOf('day').toDate();
}

/**
 * Obtient le début de la journée de demain
 */
export function getTomorrowStart(): Date {
  return dayjs.tz().add(1, 'day').startOf('day').toDate();
}

/**
 * Convertit une date en string formatée (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return dayjs(date).tz().format('YYYY-MM-DD');
}

/**
 * Vérifie si une date est dans la plage d'une journée
 * Les dates sont comparées en fonction de leur jour, pas de leur heure UTC
 */
export function isDateInDayRange(date: Date, dayStart: Date, dayEnd: Date): boolean {
  // Convertir les dates en format YYYY-MM-DD pour comparaison par jour
  const dateStr = formatDate(date);
  const dayStartStr = formatDate(dayStart);
  const dayEndStr = formatDate(dayEnd);
  
  // Si la date est entre le début et la fin (exclus) du jour
  return dateStr >= dayStartStr && dateStr < dayEndStr;
}

