import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { deletePayrollScreenshotObjects } from '@/lib/payroll/s3';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  const report = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ report });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  const report = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
    select: { id: true, screenshotKeys: true },
  });

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await deletePayrollScreenshotObjects(report.screenshotKeys);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'S3 delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await prisma.payrollWeeklyReport.delete({ where: { id: report.id } });

  return NextResponse.json({ ok: true });
}
