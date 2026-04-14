'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Permissions, PermissionsContextType } from '@/types/permissions';
import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import { APP_SETTINGS_DEFAULTS } from '@/lib/appSettingsShared';

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  userRole: null,
  loading: false,
  appSettings: APP_SETTINGS_DEFAULTS,
});

interface PermissionsProviderProps {
  children: ReactNode;
  initialPermissions: Permissions | null;
  initialRole: string | null;
  initialAppSettings: AppSettingsDTO;
}

export function PermissionsProvider({
  children,
  initialPermissions,
  initialRole,
  initialAppSettings,
}: PermissionsProviderProps) {
  return (
    <PermissionsContext.Provider 
      value={{ 
        permissions: initialPermissions, 
        userRole: initialRole, 
        loading: false,
        appSettings: initialAppSettings,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

