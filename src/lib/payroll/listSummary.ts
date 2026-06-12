import type { PayrollReportListSummary } from './apiRow';

export function extractPayrollListSummary(resultJson: unknown): PayrollReportListSummary | null {
  if (!resultJson || typeof resultJson !== 'object') return null;
  const globalStats = (resultJson as { global_stats?: unknown }).global_stats;
  if (!globalStats || typeof globalStats !== 'object') return null;
  const stats = globalStats as Record<string, unknown>;
  return {
    totalPatientsSoignes:
      typeof stats.total_patients_soignes === 'number' ? stats.total_patients_soignes : 0,
    totalSherifs: typeof stats.total_sherifs === 'number' ? stats.total_sherifs : 0,
  };
}
