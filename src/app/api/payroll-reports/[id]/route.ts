import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import { recalculatePayrollResult } from '@/lib/payroll/recalculatePayrollResult';

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

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
    select: { id: true, errorMessage: true, resultJson: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.errorMessage != null) {
    return NextResponse.json({ error: 'Cannot update a failed report' }, { status: 400 });
  }

  if (existing.resultJson == null) {
    return NextResponse.json({ error: 'No result data to update' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('resultJson' in body)) {
    return NextResponse.json({ error: 'Missing resultJson' }, { status: 400 });
  }

  const parsedBody = payrollReportResultSchema.safeParse(
    (body as { resultJson: unknown }).resultJson,
  );
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid resultJson' }, { status: 400 });
  }

  const resultJson = recalculatePayrollResult(parsedBody.data);

  await prisma.payrollWeeklyReport.update({
    where: { id: existing.id },
    data: { resultJson: resultJson as object },
  });

  return NextResponse.json({ ok: true, resultJson });
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
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.payrollWeeklyReport.delete({ where: { id: report.id } });

  return NextResponse.json({ ok: true });
}
