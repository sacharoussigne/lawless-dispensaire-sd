import { describe, expect, it } from 'vitest';
import {
  isTodoTaskArchived,
  TODO_TASK_ARCHIVE_AFTER_MS,
} from '@/lib/agenda/todoArchive';

describe('isTodoTaskArchived', () => {
  const now = Date.parse('2026-06-09T15:00:00.000Z');

  it('returns false for active tasks', () => {
    expect(
      isTodoTaskArchived({ completed: false, completedAt: null }, now),
    ).toBe(false);
  });

  it('returns false when completed less than one hour ago', () => {
    expect(
      isTodoTaskArchived(
        {
          completed: true,
          completedAt: new Date(now - TODO_TASK_ARCHIVE_AFTER_MS + 60_000),
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns true when completed more than one hour ago', () => {
    expect(
      isTodoTaskArchived(
        {
          completed: true,
          completedAt: new Date(now - TODO_TASK_ARCHIVE_AFTER_MS - 1),
        },
        now,
      ),
    ).toBe(true);
  });

  it('archives legacy completed tasks without completedAt', () => {
    expect(
      isTodoTaskArchived({ completed: true, completedAt: null }, now),
    ).toBe(true);
  });
});
