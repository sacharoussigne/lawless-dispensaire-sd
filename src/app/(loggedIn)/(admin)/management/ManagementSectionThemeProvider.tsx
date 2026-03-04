'use client';

import { MantineProvider } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import baseTheme from '@/lib/theme';

type ManagementSection =
  | 'categoryItems'
  | 'items'
  | 'chests'
  | 'companyGroups'
  | 'companies'
  | 'letterTemplates';

const sectionPrimaryColor: Record<ManagementSection, MantineThemeOverride['primaryColor']> = {
  categoryItems: 'teal',
  items: 'grape',
  chests: 'orange',
  companyGroups: 'indigo',
  companies: 'blue',
  letterTemplates: 'violet',
};

export function ManagementSectionThemeProvider({
  section,
  children,
}: {
  section: ManagementSection;
  children: React.ReactNode;
}) {
  const primaryColor = sectionPrimaryColor[section] ?? baseTheme.primaryColor;

  return (
    <MantineProvider
      theme={{
        ...baseTheme,
        primaryColor,
      }}
    >
      {children}
    </MantineProvider>
  );
}

