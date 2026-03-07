import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";

export async function hasToBeLoggedInMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    return routes.redirect(request, routes.auth.login);
  }

  return NextResponse.next();
}
