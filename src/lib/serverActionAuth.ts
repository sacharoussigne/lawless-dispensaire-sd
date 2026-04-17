import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock, type AppFeatureKey } from '@/lib/appSettings';
import { checkRolePermission } from '@/lib/auth/permissions';

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getAuthSession>>>;

export type ActionFailure = {
  status: number;
  error: string;
};

export async function requireSession(): Promise<
  { ok: true; session: AuthSession } | { ok: false; response: ActionFailure }
> {
  const session = await getAuthSession();
  if (!session) {
    return { ok: false, response: { status: 401, error: 'Non autorisé' } };
  }
  return { ok: true, session };
}

export async function requireFeature(
  feature: AppFeatureKey,
): Promise<{ ok: true } | { ok: false; response: ActionFailure }> {
  const block = await getAppFeatureActionBlock(feature);
  if (block) {
    return { ok: false, response: block };
  }
  return { ok: true };
}

type PermissionResource = Parameters<typeof checkRolePermission>[1];

export function requirePermission(
  userRole: string | null | undefined,
  resource: PermissionResource,
  action: string,
  message = 'Permission refusée',
): { ok: true } | { ok: false; response: ActionFailure } {
  if (!checkRolePermission(userRole, resource, action)) {
    return { ok: false, response: { status: 403, error: message } };
  }
  return { ok: true };
}

export type ServerActionGuardOptions = {
  feature?: AppFeatureKey;
  permission?: {
    resource: PermissionResource;
    action: string;
    message?: string;
  };
};

export async function requireServerActionContext(
  options: ServerActionGuardOptions = {},
): Promise<
  { ok: true; session: AuthSession } | { ok: false; response: ActionFailure }
> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return sessionResult;

  if (options.feature) {
    const featureResult = await requireFeature(options.feature);
    if (!featureResult.ok) return featureResult;
  }

  if (options.permission) {
    const permResult = requirePermission(
      sessionResult.session.user?.role,
      options.permission.resource,
      options.permission.action,
      options.permission.message,
    );
    if (!permResult.ok) return permResult;
  }

  return { ok: true, session: sessionResult.session };
}
