'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authClient } from '@/lib/client';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import type { Permissions, PermissionsContextType } from '@/types/permissions';

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  userRole: null,
  loading: true,
});

interface PermissionsProviderProps {
  children: ReactNode;
  initialPermissions?: Permissions | null;
  initialRole?: string | null;
}

export function PermissionsProvider({
  children,
  initialPermissions = null,
  initialRole = null,
}: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<Permissions | null>(initialPermissions);
  const [userRole, setUserRole] = useState<string | null>(initialRole);
  const [loading, setLoading] = useState(!initialPermissions);

  useEffect(() => {
    // Si les permissions initiales sont fournies, on les utilise directement
    if (initialPermissions && initialRole) {
      setPermissions(initialPermissions);
      setUserRole(initialRole);
      setLoading(false);
      return;
    }

    // Sinon, charger la session côté client (fallback pour les cas où le layout n'est pas un Server Component)
    authClient.getSession().then((session) => {
      if (session?.data?.user?.role) {
        const role = session.data.user.role;
        setUserRole(role);
        const perms = calculatePermissions(role);
        setPermissions(perms);
      }
      setLoading(false);
    });
  }, [initialPermissions, initialRole]);

  return (
    <PermissionsContext.Provider value={{ permissions, userRole, loading }}>
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

