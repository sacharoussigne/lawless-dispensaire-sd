import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { unauthorizedResponse } from "@/lib/response";

export async function hasToBeLoggedInMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    if (request.headers.get("content-type") === "application/json") {
      return unauthorizedResponse({ error: "Not authorized" });
    }
    return routes.redirect(request, routes.auth.login);
  }

  return NextResponse.next();
}
