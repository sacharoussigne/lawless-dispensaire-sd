'use client';

import { useCallback, useEffect, useState } from 'react';
import { payrollReportResultSchema, type PayrollReportResult } from '@/lib/payroll/schema';
import { recalculatePayrollResult } from '@/lib/payroll/recalculatePayrollResult';
import type { PayrollDay } from './payrollDetailUtils';

export function usePayrollReportDraft(report: {
  id: string;
  resultJson: unknown;
  errorMessage: string | null;
}) {
  const [draft, setDraft] = useState<PayrollReportResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pricingSectionOpen, setPricingSectionOpen] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState('');

  const resultFingerprint = JSON.stringify(report.resultJson ?? null);

  useEffect(() => {
    setIsEditing(false);
    if (report.errorMessage) {
      setDraft(null);
      setBaselineSnapshot('');
      return;
    }
    const p = payrollReportResultSchema.safeParse(report.resultJson);
    if (p.success) {
      const r = recalculatePayrollResult(p.data);
      setDraft(r);
      setBaselineSnapshot(JSON.stringify(r));
    } else {
      setDraft(null);
      setBaselineSnapshot('');
    }
  }, [report.errorMessage, report.id, resultFingerprint, report.resultJson]);

  useEffect(() => {
    if (isEditing) {
      setPricingSectionOpen(true);
    }
  }, [isEditing]);

  const isDirty = draft != null && JSON.stringify(draft) !== baselineSnapshot;

  const updateSchedule = useCallback(
    (empIndex: number, day: PayrollDay, field: 'caisse' | 'presence', raw: string | null) => {
      const mark =
        field === 'caisse'
          ? raw === 'X'
            ? 'X'
            : null
          : raw === 'P'
            ? 'P'
            : null;
      setDraft((prev) => {
        if (!prev) return prev;
        const employees = prev.employees.map((e, i) => {
          if (i !== empIndex) return e;
          return {
            ...e,
            schedule: {
              ...e.schedule,
              [day]: { ...e.schedule[day], [field]: mark },
            },
          };
        });
        return recalculatePayrollResult({ ...prev, employees });
      });
    },
    [],
  );

  const patchEmployeeStats = useCallback(
    (empIndex: number, patch: Partial<PayrollReportResult['employees'][number]['stats']>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const employees = prev.employees.map((e, i) =>
          i === empIndex ? { ...e, stats: { ...e.stats, ...patch } } : e,
        );
        return recalculatePayrollResult({ ...prev, employees });
      });
    },
    [],
  );

  const patchEmployeePayrollSettings = useCallback(
    (
      empIndex: number,
      patch: {
        caisse_unit_override_usd?: number | undefined;
        salary_supplement_usd?: number;
      },
    ) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const employees = prev.employees.map((e, i) => {
          if (i !== empIndex) return e;
          const next: PayrollReportResult['employees'][number] = { ...e };
          if ('caisse_unit_override_usd' in patch) {
            const v = patch.caisse_unit_override_usd;
            if (v === undefined) {
              delete next.caisse_unit_override_usd;
            } else {
              next.caisse_unit_override_usd = v;
            }
          }
          if (patch.salary_supplement_usd !== undefined) {
            next.salary_supplement_usd = patch.salary_supplement_usd;
          }
          return next;
        });
        return recalculatePayrollResult({ ...prev, employees });
      });
    },
    [],
  );

  const patchReportCaissePrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, caisse_price_usd: n }) : prev));
  }, []);

  const patchReportCaisseSalePrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, caisse_sale_price_usd: n }) : prev));
  }, []);

  const patchReportPatientCarePrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, patient_care_price_usd: n }) : prev));
  }, []);

  const patchReportOfferedItemPrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, offered_item_price_usd: n }) : prev));
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (baselineSnapshot) {
      try {
        const p = payrollReportResultSchema.safeParse(JSON.parse(baselineSnapshot) as unknown);
        if (p.success) {
          setDraft(recalculatePayrollResult(p.data));
        }
      } catch {
        // keep current draft if baseline is invalid
      }
    }
    setIsEditing(false);
  }, [baselineSnapshot]);

  const markSaved = useCallback(() => {
    if (draft) {
      setBaselineSnapshot(JSON.stringify(draft));
    }
    setIsEditing(false);
  }, [draft]);

  return {
    draft,
    isEditing,
    setIsEditing,
    isDirty,
    pricingSectionOpen,
    setPricingSectionOpen,
    updateSchedule,
    patchEmployeeStats,
    patchEmployeePayrollSettings,
    patchReportCaissePrice,
    patchReportCaisseSalePrice,
    patchReportPatientCarePrice,
    patchReportOfferedItemPrice,
    handleCancelEdit,
    markSaved,
  };
}
