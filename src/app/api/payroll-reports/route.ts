import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { PayrollWeeklyReportStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { parsePayrollHtmlTable, parsedToPayrollReportResult } from '@/lib/payroll/parsePayrollHtmlTable';
import { weekRangeFromIsoDate } from '@/lib/payroll/week';

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

  const reports = await prisma.payrollWeeklyReport.findMany({
    orderBy: { weekStart: 'desc' },
    take: 100,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      status: true,
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

  const formData = await request.formData();
  const weekRef = formData.get('weekStart');
  const weekStartStr = typeof weekRef === 'string' ? weekRef : null;
  const htmlRaw = formData.get('tableHtml');
  const tableHtml = typeof htmlRaw === 'string' ? htmlRaw : '';

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
    return NextResponse.json({ error: 'A report already exists for this week' }, { status: 409 });
  }

  const reportId = randomUUID();

  await prisma.payrollWeeklyReport.create({
    data: {
      id: reportId,
      weekStart,
      weekEnd,
      status: PayrollWeeklyReportStatus.PROCESSING,
      screenshotKeys: [],
      createdById: session.user.id,
    },
  });

  try {
    const result = parsedToPayrollReportResult(parsed);

    await prisma.payrollWeeklyReport.update({
      where: { id: reportId },
      data: {
        resultJson: result as object,
        status: PayrollWeeklyReportStatus.READY,
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
        status: PayrollWeeklyReportStatus.FAILED,
        errorMessage: msg,
      },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
