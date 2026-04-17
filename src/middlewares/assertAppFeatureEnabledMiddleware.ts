import { NextRequest, NextResponse } from 'next/server';
import {
  isAppFeatureEnabled,
  loadAppSettingsFromDb,
  type AppFeatureKey,
} from '@/lib/appSettings';
import { routes } from '@/types/routes';
import type { AppMiddlewareSession } from '@/types/middlewareSession';

export async function assertAppFeatureEnabledMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
  feature: AppFeatureKey,
): Promise<NextResponse> {
  void session;
  const settings = await loadAppSettingsFromDb();
  if (isAppFeatureEnabled(settings, feature)) {
    return NextResponse.next();
  }
  return routes.redirect(request, routes.auth.noAccess);
}
