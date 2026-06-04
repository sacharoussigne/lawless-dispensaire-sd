'use client';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import theme, { dispCssVariablesResolver } from '@/lib/theme';

export function MantineAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={dispCssVariablesResolver}>
      <Notifications />
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}
