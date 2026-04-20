-- Granular history actions for bot (increment/decrement per metric); UPDATE kept for intranet edits.

ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_CHEST';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_CHEST';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_SHERIFF';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_SHERIFF';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_PATIENTS';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_PATIENTS';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_INFUSIONS';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_INFUSIONS';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_POPPY_MILK';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_POPPY_MILK';
