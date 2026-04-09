import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppFeatureActionBlock } from '@/lib/appSettings';
import { PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { parsePayrollHtmlTable, parsedToPayrollReportResult } from '@/lib/payroll/parsePayrollHtmlTable';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import { weekRangeFromIsoDate } from '@/lib/payroll/week';

const MAX_CAISSE_PRICE_USD = 1_000_000;

export const runtime = 'nodejs';

const MAX_HTML_CHARS = 600_000;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payrollFeatureBlock = await getAppFeatureActionBlock('payroll');
  if (payrollFeatureBlock) {
    return NextResponse.json({ error: payrollFeatureBlock.error }, { status: 403 });
  }

  const reports = await prisma.payrollWeeklyReport.findMany({
    orderBy: { weekStart: 'desc' },
    take: 100,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      createdAt: true,
      createdBy: { select: { name: true, id: true } },
    },
  });

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payrollFeatureBlock = await getAppFeatureActionBlock('payroll');
  if (payrollFeatureBlock) {
    return NextResponse.json({ error: payrollFeatureBlock.error }, { status: 403 });
  }

  const formData = await request.formData();
  const weekRef = formData.get('weekStart');
  const weekStartStr = typeof weekRef === 'string' ? weekRef : null;
  const htmlRaw = formData.get('tableHtml');
  const tableHtml = typeof htmlRaw === 'string' ? htmlRaw : '';
  const caisseRaw = formData.get('caissePriceUsd');
  let caissePriceUsd = PAYROLL_CAISSE_USD;
  if (caisseRaw != null && String(caisseRaw).trim() !== '') {
    const n = Number(String(caisseRaw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CAISSE_PRICE_USD) {
      return NextResponse.json(
        { error: 'Prix caisse invalide (entre 0,01 et 1 000 000 $).' },
        { status: 400 },
      );
    }
    caissePriceUsd = n;
  }

  if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 });
  }
  if (!tableHtml.trim()) {
    return NextResponse.json({ error: 'Le contenu HTML du tableau est requis' }, { status: 400 });
  }
  if (tableHtml.length > MAX_HTML_CHARS) {
    return NextResponse.json({ error: `Le HTML est trop long (max ${MAX_HTML_CHARS} caractères)` }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parsePayrollHtmlTable(tableHtml);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Échec du parse HTML';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (parsed.employees.length === 0) {
    return NextResponse.json(
      {
        error:
          'Aucune ligne employé détectée (attendu : cellule avec Médecin, Apprenti ou Infirmière). Vérifiez que le HTML contient bien le tableau.',
      },
      { status: 400 },
    );
  }

  const { weekStart, weekEnd } = weekRangeFromIsoDate(weekStartStr);

  const existing = await prisma.payrollWeeklyReport.findUnique({ where: { weekStart } });
  if (existing) {
    return NextResponse.json(
      { error: 'Un rapport existe déjà pour cette semaine.' },
      { status: 409 },
    );
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
    return NextResponse.json({ report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await prisma.payrollWeeklyReport.update({
      where: { id: reportId },
      data: {
        errorMessage: msg,
      },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
