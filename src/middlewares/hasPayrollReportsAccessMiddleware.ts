import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";

export async function hasPayrollReportsAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = session.user?.role;
  const allowed = checkRolePermission(userRole, "payroll_reports", "view");

  if (!allowed) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}
