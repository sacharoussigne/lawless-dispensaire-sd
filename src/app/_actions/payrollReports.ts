'use server';

import { randomUUID } from 'crypto';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppFeatureActionBlock } from '@/lib/appSettings';
import { PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { parsePayrollHtmlTable, parsedToPayrollReportResult } from '@/lib/payroll/parsePayrollHtmlTable';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import { weekRangeFromIsoDate } from '@/lib/payroll/week';
import { recalculatePayrollResult } from '@/lib/payroll/recalculatePayrollResult';

const MAX_CAISSE_PRICE_USD = 1_000_000;
const MAX_HTML_CHARS = 600_000;

export async function createPayrollReportFromForm(formData: FormData) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { status: 401, error: 'Non autorisé' };
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return { status: 403, error: 'Accès refusé' };
  }

  const payrollFeatureBlock = await getAppFeatureActionBlock('payroll');
  if (payrollFeatureBlock) {
    return payrollFeatureBlock;
  }

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
        error: 'Prix caisse invalide (entre 0,01 et 1 000 000 $).',
      };
    }
    caissePriceUsd = n;
  }

  if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return { status: 400, error: 'weekStart must be YYYY-MM-DD' };
  }
  if (!tableHtml.trim()) {
    return { status: 400, error: 'Le contenu HTML du tableau est requis' };
  }
  if (tableHtml.length > MAX_HTML_CHARS) {
    return { status: 400, error: `Le HTML est trop long (max ${MAX_HTML_CHARS} caractères)` };
  }

  let parsed;
  try {
    parsed = parsePayrollHtmlTable(tableHtml);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Échec du parse HTML';
    return { status: 400, error: msg };
  }

  if (parsed.employees.length === 0) {
    return {
      status: 400,
      error:
        'Aucune ligne employé détectée (attendu : cellule avec Médecin, Apprenti ou Infirmière). Vérifiez que le HTML contient bien le tableau.',
    };
  }

  const { weekStart, weekEnd } = weekRangeFromIsoDate(weekStartStr);

  const existing = await prisma.payrollWeeklyReport.findUnique({ where: { weekStart } });
  if (existing) {
    return { status: 409, error: 'Un rapport existe déjà pour cette semaine.' };
  }

  const reportId = randomUUID();

  await prisma.payrollWeeklyReport.create({
    data: {
      id: reportId,
      weekStart,
      weekEnd,
      createdById: session.user.id,
    },
  });

  try {
    const parsedResult = parsedToPayrollReportResult(parsed);
    const result = payrollReportResultSchema.parse({
      ...parsedResult,
      caisse_price_usd: caissePriceUsd,
    });

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

export async function updatePayrollReportResultJson(id: string, resultJson: unknown) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { status: 401, error: 'Non autorisé' };
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return { status: 403, error: 'Accès refusé' };
  }

  const payrollFeatureBlock = await getAppFeatureActionBlock('payroll');
  if (payrollFeatureBlock) {
    return payrollFeatureBlock;
  }

  const existing = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
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

export async function deletePayrollReport(id: string) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { status: 401, error: 'Non autorisé' };
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return { status: 403, error: 'Accès refusé' };
  }

  const payrollFeatureBlock = await getAppFeatureActionBlock('payroll');
  if (payrollFeatureBlock) {
    return payrollFeatureBlock;
  }

  const report = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!report) {
    return { status: 404, error: 'Not found' };
  }

  await prisma.payrollWeeklyReport.delete({ where: { id: report.id } });

  return { status: 200 };
}
