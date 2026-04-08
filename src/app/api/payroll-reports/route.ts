import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { PayrollWeeklyReportStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { analyzePayrollScreenshots } from '@/lib/payroll/openai';
import { uploadPayrollScreenshots } from '@/lib/payroll/s3';
import { weekRangeFromIsoDate } from '@/lib/payroll/week';

export const runtime = 'nodejs';

const MAX_FILES = 12;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

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
  const files = formData.getAll('files').filter((f): f is File => f instanceof File);

  if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `At most ${MAX_FILES} images` }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Each file must be at most 12 MB' }, { status: 400 });
    }
  }

  const { weekStart, weekEnd } = weekRangeFromIsoDate(weekStartStr);

  const existing = await prisma.payrollWeeklyReport.findUnique({ where: { weekStart } });
  if (existing) {
    return NextResponse.json({ error: 'A report already exists for this week' }, { status: 409 });
  }

  const reportId = randomUUID();
  const buffers: { buffer: Buffer; contentType: string }[] = [];
  const base64ForAi: { mime: string; data: string }[] = [];

  for (const file of files) {
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);
    const contentType = file.type || 'image/png';
    buffers.push({ buffer, contentType });
    base64ForAi.push({ mime: contentType, data: buffer.toString('base64') });
  }

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
    const keys = await uploadPayrollScreenshots(reportId, buffers);
    const result = await analyzePayrollScreenshots(base64ForAi);

    await prisma.payrollWeeklyReport.update({
      where: { id: reportId },
      data: {
        screenshotKeys: keys,
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
