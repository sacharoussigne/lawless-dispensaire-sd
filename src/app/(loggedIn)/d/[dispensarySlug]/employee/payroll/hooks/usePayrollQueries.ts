'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useTenantRoutes, useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import {
  createPayrollReportFromForm,
  deletePayrollReport,
  getPayrollReportById,
  listPayrollImportableActivityWeeks,
  listPayrollReports,
  updatePayrollReportResultJson,
} from '@/app/_actions/payrollReports';
import { handleAction } from '@/lib/action';
import type {
  SerializedPayrollReportDetail,
  SerializedPayrollReportListItem,
} from '@/lib/payroll/apiRow';
import { payrollKeys } from '@/lib/payroll/queryKeys';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import type { PayrollReportResult } from '@/lib/payroll/schema';

export type PayrollReportListItem = SerializedPayrollReportListItem;
export type PayrollReportDetail = SerializedPayrollReportDetail;

export type PayrollImportableWeek = {
  weekStart: string;
  periodStart: string;
  periodEnd: string;
};

async function fetchPayrollReports(dispensarySlug: string): Promise<PayrollReportListItem[]> {
  const result = await listPayrollReports(dispensarySlug);
  const data = handleAction(result) as { reports?: PayrollReportListItem[] } | undefined;
  return data?.reports ?? [];
}

async function fetchPayrollReportDetail(
  dispensarySlug: string,
  reportId: string,
): Promise<PayrollReportDetail> {
  const result = await getPayrollReportById(dispensarySlug, reportId);
  const data = handleAction(result) as { report?: PayrollReportDetail } | undefined;
  if (!data?.report) {
    throw new Error('Rapport introuvable');
  }
  return data.report;
}

async function fetchPayrollImportableActivityWeeks(
  dispensarySlug: string,
): Promise<PayrollImportableWeek[]> {
  const result = await listPayrollImportableActivityWeeks(dispensarySlug);
  const data = handleAction(result) as { weeks?: PayrollImportableWeek[] } | undefined;
  return data?.weeks ?? [];
}

export function usePayrollReports(initialReports?: PayrollReportListItem[]) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: payrollKeys.list(dispensarySlug),
    queryFn: () => fetchPayrollReports(dispensarySlug),
    initialData: initialReports,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function usePayrollReportDetail(
  reportId: string,
  initialReport?: PayrollReportDetail,
) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: payrollKeys.detail(dispensarySlug, reportId),
    queryFn: () => fetchPayrollReportDetail(dispensarySlug, reportId),
    initialData: initialReport,
    enabled: Boolean(dispensarySlug && reportId),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function usePayrollImportableActivityWeeks(enabled: boolean) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: payrollKeys.importableActivityWeeks(dispensarySlug),
    queryFn: () => fetchPayrollImportableActivityWeeks(dispensarySlug),
    enabled: Boolean(dispensarySlug && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useInvalidatePayroll() {
  const queryClient = useQueryClient();
  const dispensarySlug = useRequiredDispensarySlug();

  return {
    invalidateList: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.list(dispensarySlug) });
    },
    invalidateDetail: (reportId: string) => {
      void queryClient.invalidateQueries({
        queryKey: payrollKeys.detail(dispensarySlug, reportId),
      });
    },
    invalidateAll: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all(dispensarySlug) });
    },
  };
}

export function useCreatePayrollReportMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const routes = useTenantRoutes();
  const router = useRouter();
  const { invalidateList } = useInvalidatePayroll();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createPayrollReportFromForm(dispensarySlug, formData);
      const data = handleAction(result) as { id?: string } | undefined;
      return data?.id ?? null;
    },
    onSuccess: (reportId) => {
      invalidateList();
      notifications.show({ title: 'Rapport créé', message: 'Analyse terminée.', color: 'moss' });
      router.push(
        reportId ? routes.employee.payrollDetail(reportId) : routes.employee.payroll,
      );
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur inconnue',
        color: 'danger',
      });
    },
  });
}

export function useUpdatePayrollReportMutation(reportId: string) {
  const dispensarySlug = useRequiredDispensarySlug();
  const queryClient = useQueryClient();
  const { invalidateList } = useInvalidatePayroll();

  return useMutation({
    mutationFn: async (resultJson: PayrollReportResult) => {
      const result = await updatePayrollReportResultJson(dispensarySlug, reportId, resultJson);
      const data = handleAction(result) as { resultJson?: PayrollReportResult } | undefined;
      return data?.resultJson ?? resultJson;
    },
    onSuccess: (resultJson) => {
      queryClient.setQueryData<PayrollReportDetail>(
        payrollKeys.detail(dispensarySlug, reportId),
        (prev) => (prev ? { ...prev, resultJson } : prev),
      );
      invalidateList();
      notifications.show({ title: 'Enregistré', message: '', color: 'moss' });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur inconnue',
        color: 'danger',
      });
    },
  });
}

export function useDeletePayrollReportMutation(options?: { redirectToList?: boolean }) {
  const dispensarySlug = useRequiredDispensarySlug();
  const routes = useTenantRoutes();
  const router = useRouter();
  const { invalidateList } = useInvalidatePayroll();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const result = await deletePayrollReport(dispensarySlug, reportId);
      handleAction(result);
      return reportId;
    },
    onSuccess: () => {
      invalidateList();
      notifications.show({ title: 'Rapport supprimé', message: '', color: 'moss' });
      if (options?.redirectToList) {
        router.push(routes.employee.payroll);
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur inconnue',
        color: 'danger',
      });
    },
  });
}
