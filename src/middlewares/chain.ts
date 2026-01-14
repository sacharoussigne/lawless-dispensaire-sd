import { NextRequest, NextResponse } from "next/server";

export const chain = (...middlewares: any[]) => {
  return async (req: NextRequest, session: any) => {
    for (const middleware of middlewares) {
      const result = await middleware(req, session);
      if (result.headers.get("Location") || result.status !== 200 ||result.headers.get("x-middleware-rewrite") || result.headers.get("content-type") === "application/json") {
        return result;
      }
    }
    return NextResponse.next();
  };
};
