'use client';

import { AgendaRealtimeProvider } from '@/lib/agenda/realtime/AgendaRealtimeProvider';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { ReactNode } from 'react';

export function DispensaryRealtimeShell({ children }: { children: ReactNode }) {
  const { dispensarySlug, agendaModuleAccess } = usePermissions();

  if (!agendaModuleAccess || !dispensarySlug) {
    return children;
  }

  return (
    <AgendaRealtimeProvider dispensarySlug={dispensarySlug}>
      {children}
    </AgendaRealtimeProvider>
  );
}
