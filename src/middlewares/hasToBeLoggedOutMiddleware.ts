import {type NextRequest, NextResponse} from "next/server";
import {routes} from "@/types/routes";
import type { AppMiddlewareSession } from "@/types/middlewareSession";

export async function hasToBeLoggedOutMiddleware(request: NextRequest, session: AppMiddlewareSession) {
    if(session) {
        return routes.redirect(request, routes.employee.index);
    }

    return NextResponse.next();
}