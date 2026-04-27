import { describe, expect, it } from 'vitest';
import {
  isPayrollReportType,
  PAYROLL_REPORT_TYPE_EMPLOYES,
  PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
} from '@/lib/payroll/constants';

describe('isPayrollReportType', () => {
  it('accepts known labels', () => {
    expect(isPayrollReportType(PAYROLL_REPORT_TYPE_EMPLOYES)).toBe(true);
    expect(isPayrollReportType(PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE)).toBe(true);
  });
  it('rejects unknown strings', () => {
    expect(isPayrollReportType('autre')).toBe(false);
    expect(isPayrollReportType('')).toBe(false);
  });
});
