import { NextRequest, NextResponse } from 'next/server';
import {
  isAppFeatureEnabled,
  loadAppSettingsFromDb,
  type AppFeatureKey,
} from '@/lib/appSettings';
import { routes } from '@/types/routes';

export async function assertAppFeatureEnabledMiddleware(
  request: NextRequest,
  session: unknown,
  feature: AppFeatureKey,
): Promise<NextResponse> {
  void session;
  const settings = await loadAppSettingsFromDb();
  if (isAppFeatureEnabled(settings, feature)) {
    return NextResponse.next();
  }
  return routes.redirect(request, routes.auth.noAccess);
}
