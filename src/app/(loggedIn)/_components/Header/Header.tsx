'use client';

import {
  Avatar,
  Button,
  Container,
  Group,
  Menu,
  SegmentedControl,
  Select,
  UnstyledButton,
} from '@mantine/core';
import classes from './Header.module.scss';
import { authClient } from '@/lib/client';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { AuthSession } from '@/types/session';
import { routes, tenantRoutes } from '@/types/routes';
import Link from 'next/link';
import Image from 'next/image';
import { IconArrowBackUp, IconLogout, IconSettings } from '@tabler/icons-react';
import { HeaderNavLinks } from './HeaderNavLinks';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { dispensarySiteTitle } from '@/lib/appSettingsShared';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { DEFAULT_DISPENSARY_SLUG } from '@/lib/dispensary/constants';
import { rewritePathWithDispensarySlug } from '@/lib/dispensary/slug';

export default function Header({
  session,
  impersonatorDisplayName,
  dispensarySlug: dispensarySlugProp,
}: Readonly<{
  session: AuthSession | null;
  impersonatorDisplayName?: string | null;
  dispensarySlug?: string;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
  const {
    permissions,
    userRole,
    appSettings,
    dispensarySlug: ctxSlug,
    accessibleDispensaries,
  } = usePermissions();

  const dispensarySlug = dispensarySlugProp ?? ctxSlug;
  const t = dispensarySlug ? tenantRoutes(dispensarySlug) : null;
  const isPlatformAdminUser = isPlatformAdmin(session?.user?.role);
  const defaultTenantSlug =
    accessibleDispensaries.find((d) => d.slug === DEFAULT_DISPENSARY_SLUG)?.slug ??
    accessibleDispensaries[0]?.slug ??
    null;

  const isImpersonating = Boolean(session?.session.impersonatedBy);

  const isManagementSpace =
    Boolean(t && pathname?.startsWith(t.management.index)) ||
    pathname?.startsWith('/management') ||
    false;
  const isAdminOrManagementSpace = isManagementSpace;

  const handleSpaceChange = (value: string) => {
    if (!t) return;
    if (value === 'employee') {
      router.push(t.employee.index);
    } else if (value === 'management') {
      router.push(t.management.index);
    }
  };

  const handleDispensaryChange = (newSlug: string | null) => {
    if (!newSlug || !pathname) return;
    router.push(rewritePathWithDispensarySlug(pathname, newSlug));
  };

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  const handleStopImpersonating = async () => {
    setStoppingImpersonation(true);
    try {
      const result = await authClient.admin.stopImpersonating();
      if (result.error) {
        notifications.show({
          title: 'Erreur',
          message: result.error.message || 'Impossible de quitter la session impersonnée.',
          color: 'red',
        });
        return;
      }
      notifications.show({
        title: 'Session restaurée',
        message: 'Vous êtes de nouveau connecté avec votre compte.',
        color: 'green',
      });
      router.refresh();
      router.push(routes.platform.users);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de quitter la session impersonnée.',
        color: 'red',
      });
    } finally {
      setStoppingImpersonation(false);
    }
  };

  const canSwitchSpaces = permissions?.application.management === true;

  const isRouteActive = (route: string) => {
    if (!pathname) return false;
    if (pathname === route) return true;
    if (pathname.startsWith(`${route}/`)) return true;
    return false;
  };

  const logoHref = t
    ? isManagementSpace
      ? t.management.index
      : t.employee.index
    : defaultTenantSlug
      ? tenantRoutes(defaultTenantSlug).employee.index
      : routes.platform.dispensaries;

  return (
    <header className={`${classes.header} mb-10`}>
      <Container size={'xl'}>
        <div className={classes.headerInner}>
          <Group gap="md" wrap="nowrap" className={classes.headerSide}>
            <Link href={logoHref} className={classes.logoLink}>
              <Image
                src="/logo_dispensaire.png"
                alt={dispensarySiteTitle(appSettings)}
                width={50}
                height={50}
                className="rounded-full"
                style={{ borderRadius: '50%' }}
              />
            </Link>
            {session && accessibleDispensaries.length > 1 && (
              <Select
                aria-label="Dispensaire"
                data={accessibleDispensaries.map((d) => ({
                  value: d.slug,
                  label: d.name,
                }))}
                value={dispensarySlug ?? defaultTenantSlug ?? null}
                onChange={handleDispensaryChange}
                allowDeselect={false}
                w={200}
                size="sm"
              />
            )}
          </Group>

          {session && t ? (
            <>
              <div className={classes.headerNavSlot}>
                <HeaderNavLinks
                t={t}
                appSettings={appSettings}
                permissions={permissions}
                userRole={userRole}
                isManagementSpace={isAdminOrManagementSpace}
                canManage={permissions?.application.management === true}
                isRouteActive={isRouteActive}
                />
              </div>

              <Group gap="sm" wrap="nowrap" className={classes.headerSide}>
                {canSwitchSpaces && (
                  <SegmentedControl
                    value={isAdminOrManagementSpace ? 'management' : 'employee'}
                    onChange={handleSpaceChange}
                    data={[
                      { label: 'Employé', value: 'employee' },
                      { label: 'Gestion', value: 'management' },
                    ]}
                  />
                )}
                <Menu
                  width={260}
                  position="bottom-end"
                  transitionProps={{ transition: 'pop-top-right' }}
                  onClose={() => setUserMenuOpened(false)}
                  onOpen={() => setUserMenuOpened(true)}
                  withinPortal
                >
                  <Menu.Target>
                    <UnstyledButton className={`user ${userMenuOpened ? 'userActive' : ''}`}>
                      <Group gap={7}>
                        <Avatar
                          alt={session.user.name}
                          radius="xl"
                          size={40}
                          src={session.user.image ?? null}
                        />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {isPlatformAdminUser && (
                      <>
                        <Menu.Label>Plateforme</Menu.Label>
                        <Menu.Item component={Link} href={routes.platform.dispensaries}>
                          Dispensaires
                        </Menu.Item>
                        <Menu.Item component={Link} href={routes.platform.users}>
                          Comptes utilisateurs
                        </Menu.Item>
                        <Menu.Divider />
                      </>
                    )}
                    {hasRole(userRole, Role.ADMIN) && t && (
                      <>
                        <Menu.Label>Admin dispensaire</Menu.Label>
                        <Link href={t.admin.members}>
                          <Menu.Item>Membres</Menu.Item>
                        </Link>
                        {appSettings.featureStockEnabled && (
                          <Link href={t.admin.overwriteStock}>
                            <Menu.Item>Écraser les stocks</Menu.Item>
                          </Link>
                        )}
                        <Link href={t.admin.settings}>
                          <Menu.Item>Paramètres du dispensaire</Menu.Item>
                        </Link>
                        <Menu.Divider />
                      </>
                    )}
                    <Link href={routes.settings.index}>
                      <Menu.Item leftSection={<IconSettings size={16} stroke={1.5} />}>
                        Paramètres compte
                      </Menu.Item>
                    </Link>
                    <Menu.Item
                      leftSection={<IconLogout size={16} stroke={1.5} />}
                      onClick={handleLogout}
                    >
                      Déconnexion
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                {isImpersonating && (
                  <Button
                    color="orange"
                    variant="light"
                    leftSection={<IconArrowBackUp size={18} />}
                    loading={stoppingImpersonation}
                    onClick={handleStopImpersonating}
                  >
                    {impersonatorDisplayName?.trim() || 'Compte'}
                  </Button>
                )}
              </Group>
            </>
          ) : session ? (
            <Group gap="sm" wrap="nowrap" className={`${classes.headerSide} ms-auto`}>
              {defaultTenantSlug && (
                <Button
                  component={Link}
                  href={tenantRoutes(defaultTenantSlug).employee.index}
                  variant="filled"
                >
                  Retour à l&apos;application
                </Button>
              )}
              {isPlatformAdminUser && (
                <>
                  <Button component={Link} href={routes.platform.users} variant="light">
                    Comptes utilisateurs
                  </Button>
                  <Button component={Link} href={routes.platform.dispensaries} variant="light">
                    Dispensaires
                  </Button>
                </>
              )}
              <Menu withinPortal>
                <Menu.Target>
                  <Avatar alt={session.user.name} radius="xl" size={40} src={session.user.image ?? null} />
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={handleLogout}>Déconnexion</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ) : (
            <Group gap="sm" wrap="nowrap" className={`${classes.headerSide} ms-auto`}>
              <Button variant="default">Se connecter</Button>
              <Button>S&apos;inscrire</Button>
            </Group>
          )}
        </div>
      </Container>
    </header>
  );
}
