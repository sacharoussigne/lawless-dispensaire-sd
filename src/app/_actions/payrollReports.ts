'use server';

import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import {
  PAYROLL_CAISSE_SALE_USD,
  PAYROLL_CAISSE_USD,
  PAYROLL_OFFERED_ITEM_USD,
  PAYROLL_PATIENT_CARE_USD,
  PAYROLL_REPORT_TYPE_EMPLOYES,
  isPayrollReportType,
} from '@/lib/payroll/constants';
import { mergeHtmlAndWeeklyActivity, type WaRow } from '@/lib/payroll/mergeWeeklyActivity';
import { type ParsedPayrollTable, parsePayrollHtmlTable } from '@/lib/payroll/parsePayrollHtmlTable';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import { weekRangeFromIsoDate } from '@/lib/payroll/week';
import { recalculatePayrollResult } from '@/lib/payroll/recalculatePayrollResult';

const MAX_CAISSE_PRICE_USD = 1_000_000;
const MAX_HTML_CHARS = 600_000;

const emptyGlobalStats = () => ({
  total_employees: 0,
  total_caisses: 0,
  total_sherifs: 0,
  total_palefreniers: 0,
  total_benefit_usd: 0,
  total_patients_soignes: 0,
  total_offered_item_count: 0,
  total_employee_payout_usd: 0,
  total_offered_retail_value_usd: 0,
});

const payrollGuardOptions = {
  feature: 'payroll' as const,
  permission: {
    resource: 'payroll_reports' as const,
    action: 'create',
    message: 'Accès refusé',
  },
};

export async function createPayrollReportFromForm(dispensarySlug: string, formData: FormData) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, payrollGuardOptions);
  if (!ctx.ok) return ctx.response;
  const { dispensaryId } = ctx.tenant;

  const weekRef = formData.get('weekStart');
  const weekStartStr = typeof weekRef === 'string' ? weekRef : null;
  const htmlRaw = formData.get('tableHtml');
  const tableHtml = typeof htmlRaw === 'string' ? htmlRaw : '';
  const caisseRaw = formData.get('caissePriceUsd');
  let caissePriceUsd = PAYROLL_CAISSE_USD;
  if (caisseRaw != null && String(caisseRaw).trim() !== '') {
    const n = Number(String(caisseRaw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CAISSE_PRICE_USD) {
      return {
        status: 400,
        error: 'Montant reversé employé invalide (entre 0,01 et 1 000 000 $).',
      };
    }
    caissePriceUsd = n;
  }

  const caisseSaleRaw = formData.get('caisseSalePriceUsd');
  let caisseSalePriceUsd = PAYROLL_CAISSE_SALE_USD;
  if (caisseSaleRaw != null && String(caisseSaleRaw).trim() !== '') {
    const n = Number(String(caisseSaleRaw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CAISSE_PRICE_USD) {
      return {
        status: 400,
        error: 'Prix de vente dispensaire invalide (entre 0,01 et 1 000 000 $).',
      };
    }
    caisseSalePriceUsd = n;
  }

  const patientCareRaw = formData.get('patientCarePriceUsd');
  let patientCarePriceUsd = PAYROLL_PATIENT_CARE_USD;
  if (patientCareRaw != null && String(patientCareRaw).trim() !== '') {
    const n = Number(String(patientCareRaw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CAISSE_PRICE_USD) {
      return { status: 400, error: 'Prix par patient soigné invalide (entre 0,01 et 1 000 000 $).' };
    }
    patientCarePriceUsd = n;
  }

  const offeredRaw = formData.get('offeredItemPriceUsd');
  let offeredItemPriceUsd = PAYROLL_OFFERED_ITEM_USD;
  if (offeredRaw != null && String(offeredRaw).trim() !== '') {
    const n = Number(String(offeredRaw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CAISSE_PRICE_USD) {
      return { status: 400, error: "Prix unitaire d'offre invalide (entre 0,01 et 1 000 000 $)." };
    }
    offeredItemPriceUsd = n;
  }

  const importWaRaw = formData.get('importWeeklyActivity');
  const importWeeklyActivity =
    importWaRaw === '1' || importWaRaw === 'on' || importWaRaw === 'true';

  const waWeekRef = formData.get('weeklyActivityWeekStart');
  const waWeekStartStr =
    importWeeklyActivity &&
    typeof waWeekRef === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(waWeekRef.trim())
      ? waWeekRef.trim()
      : null;

  if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return { status: 400, error: 'weekStart must be YYYY-MM-DD' };
  }

  const reportTypeRaw = formData.get('reportType');
  const reportTypeStr =
    typeof reportTypeRaw === 'string' && reportTypeRaw.trim() !== ''
      ? reportTypeRaw.trim()
      : PAYROLL_REPORT_TYPE_EMPLOYES;
  if (!isPayrollReportType(reportTypeStr)) {
    return { status: 400, error: 'Type de rapport invalide.' };
  }
  const reportType = reportTypeStr;

  if (tableHtml.length > MAX_HTML_CHARS) {
    return { status: 400, error: `Le HTML est trop long (max ${MAX_HTML_CHARS} caractères)` };
  }

  const emptyParsed: ParsedPayrollTable = {
    employees: [],
    global_stats: { total_employees: 0, total_caisses: 0, total_sherifs: 0, total_palefreniers: 0 },
  };

  let parsed: ParsedPayrollTable;
  try {
    parsed = tableHtml.trim() ? parsePayrollHtmlTable(tableHtml) : emptyParsed;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Échec du parse HTML';
    return { status: 400, error: msg };
  }

  let activitiesWithNames: WaRow[] = [];
  let waImportStart: Date | undefined;
  let waImportEnd: Date | undefined;

  if (importWeeklyActivity) {
    const range = weekRangeFromIsoDate(waWeekStartStr ?? weekStartStr);
    waImportStart = range.weekStart;
    waImportEnd = range.weekEnd;
    const rawActivities = await prisma.dispensaryWeeklyActivity.findMany({
      where: {
        periodStart: waImportStart,
        periodEnd: waImportEnd,
        ...tenantWhere(dispensaryId),
      },
    });
    activitiesWithNames = (await mergeResolvedDisplayNames(
      prisma,
      rawActivities,
    )) as WaRow[];
  }

  const employeesMerged = mergeHtmlAndWeeklyActivity(parsed, activitiesWithNames);

  if (employeesMerged.length === 0) {
    return {
      status: 400,
      error: importWeeklyActivity
        ? 'Aucune donnée : collez le tableau HTML et/ou assurez-vous qu’il existe des entrées d’activité hebdomadaire pour la semaine d’import choisie.'
        : 'Collez le tableau HTML (au moins une ligne employé) ou activez l’import d’activité hebdomadaire.',
    };
  }

  const { weekStart, weekEnd } = weekRangeFromIsoDate(weekStartStr);

  const existing = await prisma.payrollWeeklyReport.findUnique({
    where: {
      dispensaryId_weekStart_reportType: {
        dispensaryId,
        weekStart,
        reportType,
      },
    },
  });
  if (existing) {
    return { status: 409, error: 'Un rapport de ce type existe déjà pour cette semaine.' };
  }

  const reportId = randomUUID();

  await prisma.payrollWeeklyReport.create({
    data: {
      id: reportId,
      dispensaryId,
      weekStart,
      weekEnd,
      reportType,
      createdById: ctx.session.user.id,
    },
  });

  try {
    const result = recalculatePayrollResult(
      payrollReportResultSchema.parse({
        employees: employeesMerged,
        global_stats: emptyGlobalStats(),
        caisse_price_usd: caissePriceUsd,
        caisse_sale_price_usd: caisseSalePriceUsd,
        patient_care_price_usd: patientCarePriceUsd,
        offered_item_price_usd: offeredItemPriceUsd,
        ...(importWeeklyActivity && waImportStart && waImportEnd
          ? {
              weekly_activity_import: {
                weekStart: waImportStart.toISOString(),
                weekEnd: waImportEnd.toISOString(),
              },
            }
          : {}),
      }),
    );

    await prisma.payrollWeeklyReport.update({
      where: { id: reportId },
      data: {
        resultJson: result as object,
        errorMessage: null,
      },
    });

    const report = await prisma.payrollWeeklyReport.findUniqueOrThrow({ where: { id: reportId } });
    return { status: 200, data: { report } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await prisma.payrollWeeklyReport.update({
      where: { id: reportId },
      data: {
        errorMessage: msg,
      },
    });
    return { status: 500, error: msg };
  }
}

export async function updatePayrollReportResultJson(
  dispensarySlug: string,
  id: string,
  resultJson: unknown,
) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, payrollGuardOptions);
  if (!ctx.ok) return ctx.response;
  const { dispensaryId } = ctx.tenant;

  const existing = await prisma.payrollWeeklyReport.findFirst({
    where: { id, ...tenantWhere(dispensaryId) },
    select: { id: true, errorMessage: true, resultJson: true },
  });

  if (!existing) {
    return { status: 404, error: 'Not found' };
  }

  if (existing.errorMessage != null) {
    return { status: 400, error: 'Cannot update a failed report' };
  }

  if (existing.resultJson == null) {
    return { status: 400, error: 'No result data to update' };
  }

  const parsedBody = payrollReportResultSchema.safeParse(resultJson);
  if (!parsedBody.success) {
    return { status: 400, error: 'Invalid resultJson' };
  }

  const recalculated = recalculatePayrollResult(parsedBody.data);

  await prisma.payrollWeeklyReport.update({
    where: { id: existing.id },
    data: { resultJson: recalculated as object },
  });

  return { status: 200, data: { resultJson: recalculated } };
}

export async function deletePayrollReport(dispensarySlug: string, id: string) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, payrollGuardOptions);
  if (!ctx.ok) return ctx.response;
  const { dispensaryId } = ctx.tenant;

  const report = await prisma.payrollWeeklyReport.findFirst({
    where: { id, ...tenantWhere(dispensaryId) },
    select: { id: true },
  });

  if (!report) {
    return { status: 404, error: 'Not found' };
  }

  await prisma.payrollWeeklyReport.delete({ where: { id: report.id } });

  return { status: 200 };
}

export async function listPayrollImportableActivityWeeks(dispensarySlug: string) {
  const ctx = await requireTenantServerActionContext(dispensarySlug, payrollGuardOptions);
  if (!ctx.ok) return ctx.response;
  const { dispensaryId } = ctx.tenant;

  const groups = await prisma.dispensaryWeeklyActivity.groupBy({
    by: ['periodStart', 'periodEnd'],
    where: tenantWhere(dispensaryId),
    _count: { _all: true },
    orderBy: { periodStart: 'desc' },
    take: 52,
  });

  return {
    status: 200,
    data: {
      weeks: groups.map((g) => ({
        weekStart: g.periodStart.toISOString().slice(0, 10),
        periodStart: g.periodStart.toISOString(),
        periodEnd: g.periodEnd.toISOString(),
      })),
    },
  };
}
