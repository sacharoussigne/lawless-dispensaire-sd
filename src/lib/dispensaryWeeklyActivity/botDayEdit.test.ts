import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertBotEditableParisDay,
  assertParisDayInCurrentWeek,
  BotDayEditError,
  buildBotDayFieldHistoryPayload,
  resolveParisDayAnchor,
} from '@/lib/dispensaryWeeklyActivity/botDayEdit';
import dayjs from '@/lib/dayjs';

describe('botDayEdit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(dayjs.tz('2026-05-15 14:00:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves date at Paris midnight', () => {
    const anchor = resolveParisDayAnchor({ date: '2026-05-14' });
    expect(dayjs(anchor).tz('Europe/Paris').format('YYYY-MM-DD HH:mm:ss')).toBe('2026-05-14 00:00:00');
  });

  it('resolves weekday within current Paris week', () => {
    const anchor = resolveParisDayAnchor({ weekday: 'mercredi' });
    expect(dayjs(anchor).tz('Europe/Paris').format('YYYY-MM-DD')).toBe('2026-05-13');
  });

  it('rejects weekday and date together', () => {
    expect(() =>
      resolveParisDayAnchor({ weekday: 'lundi', date: '2026-05-12' }),
    ).toThrow(BotDayEditError);
  });

  it('rejects future day in current week', () => {
    expect(() => assertBotEditableParisDay(resolveParisDayAnchor({ weekday: 'dimanche' }))).toThrow(
      /pas encore éditable/,
    );
  });

  it('rejects day from previous week via date', () => {
    expect(() => assertBotEditableParisDay(resolveParisDayAnchor({ date: '2026-05-10' }))).toThrow(
      /semaine en cours/,
    );
  });

  it('allows today', () => {
    expect(() => assertBotEditableParisDay(resolveParisDayAnchor({ weekday: 'vendredi' }))).not.toThrow();
  });

  it('assertParisDayInCurrentWeek rejects last week', () => {
    const lastMonday = dayjs.tz('2026-05-04', 'YYYY-MM-DD', 'Europe/Paris').startOf('day').toDate();
    expect(() => assertParisDayInCurrentWeek(lastMonday)).toThrow(/semaine en cours/);
  });

  it('builds chest history payload', () => {
    const anchor = resolveParisDayAnchor({ weekday: 'jeudi' });
    expect(buildBotDayFieldHistoryPayload(anchor, 'chest', true)).toEqual({
      day: 'jeudi',
      date: '2026-05-14',
      chest: true,
    });
  });

  it('builds chest history for vendredi (today in frozen clock)', () => {
    const anchor = resolveParisDayAnchor({ weekday: 'vendredi' });
    expect(buildBotDayFieldHistoryPayload(anchor, 'chest', false)).toEqual({
      day: 'vendredi',
      date: '2026-05-15',
      chest: false,
    });
  });

  it('builds presence history payload', () => {
    const anchor = resolveParisDayAnchor({ date: '2026-05-13' });
    expect(buildBotDayFieldHistoryPayload(anchor, 'presence', false)).toEqual({
      day: 'mercredi',
      date: '2026-05-13',
      presence: false,
    });
  });
});
