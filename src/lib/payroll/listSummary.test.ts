import { describe, expect, it } from 'vitest';
import { extractPayrollListSummary } from './listSummary';

describe('extractPayrollListSummary', () => {
  it('extracts global_stats fields', () => {
    expect(
      extractPayrollListSummary({
        global_stats: { total_patients_soignes: 12, total_sherifs: 3 },
      }),
    ).toEqual({ totalPatientsSoignes: 12, totalSherifs: 3 });
  });

  it('returns null for invalid payload', () => {
    expect(extractPayrollListSummary(null)).toBeNull();
    expect(extractPayrollListSummary({})).toBeNull();
  });
});
