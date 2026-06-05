'use client';

import type { ReactNode } from 'react';

type ManagementSection =
  | 'categoryItems'
  | 'items'
  | 'chests'
  | 'companyGroups'
  | 'companies'
  | 'mails';

/**
 * Kept for API stability; all management sections use the global sage theme.
 */
export function ManagementSectionThemeProvider({
  children,
}: {
  section?: ManagementSection;
  children: ReactNode;
}) {
  return <>{children}</>;
}
