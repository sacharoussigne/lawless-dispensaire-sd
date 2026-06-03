export function slugifyDispensaryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'dispensary';
}

import { tenantRoutes } from '@/types/routes';

export function rewritePathWithDispensarySlug(pathname: string, newSlug: string): string {
  if (/^\/d\/[^/]+/.test(pathname)) {
    return pathname.replace(/^\/d\/[^/]+/, `/d/${encodeURIComponent(newSlug)}`);
  }
  return tenantRoutes(newSlug).employee.index;
}

export function parseDispensarySlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/d\/([^/]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
