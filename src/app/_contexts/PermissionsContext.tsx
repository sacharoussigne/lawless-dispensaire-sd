'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authClient } from '@/lib/client';
import { checkRolePermission } from '@/lib/auth/permissions';
import type { Permissions, PermissionsContextType } from '@/types/permissions';

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  userRole: null,
  loading: true,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger la session et calculer les permissions
    authClient.getSession().then((session) => {
      if (session?.data?.user?.role) {
        const role = session.data.user.role;
        setUserRole(role);

        // Calculer toutes les permissions une seule fois
        const perms: Permissions = {
          stock: {
            view: checkRolePermission(role, 'stock', 'view'),
            create: checkRolePermission(role, 'stock', 'create'),
            update: checkRolePermission(role, 'stock', 'update'),
            delete: checkRolePermission(role, 'stock', 'delete'),
            craftRead: checkRolePermission(role, 'stock', 'craft-read'),
            craftWrite: checkRolePermission(role, 'stock', 'craft-write'),
          },
          orders: {
            view: checkRolePermission(role, 'orders', 'view'),
            create: checkRolePermission(role, 'orders', 'create'),
            update: checkRolePermission(role, 'orders', 'update'),
            delete: checkRolePermission(role, 'orders', 'delete'),
          },
          application: {
            access: checkRolePermission(role, 'application', 'access'),
            management: checkRolePermission(role, 'application', 'management'),
          },
        };

        setPermissions(perms);
      }
      setLoading(false);
    });
  }, []);

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

