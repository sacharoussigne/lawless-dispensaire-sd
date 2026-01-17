import {NextRequest, NextResponse} from "next/server";
import {routes} from "@/types/routes";

export async function hasToBeLoggedOutMiddleware(request: NextRequest, session: any) {
    if(session) {
        return routes.redirect(request, routes.test.index);
    }

    return NextResponse.next();
}