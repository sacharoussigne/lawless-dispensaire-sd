'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Permissions, PermissionsContextType } from '@/types/permissions';

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  userRole: null,
  loading: false,
});

interface PermissionsProviderProps {
  children: ReactNode;
  initialPermissions: Permissions | null;
  initialRole: string | null;
}

/**
 * Provider pour les permissions de l'utilisateur.
 * Les permissions sont calculées côté serveur dans les layouts et passées ici.
 * Ce contexte ne fait que les exposer aux composants clients.
 */
export function PermissionsProvider({
  children,
  initialPermissions,
  initialRole,
}: PermissionsProviderProps) {
  return (
    <PermissionsContext.Provider 
      value={{ 
        permissions: initialPermissions, 
        userRole: initialRole, 
        loading: false 
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

