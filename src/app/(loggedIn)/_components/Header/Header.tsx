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
import { IconArrowBackUp, IconLogout, IconSearch, IconSettings } from '@tabler/icons-react';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { dispensarySiteTitle } from '@/lib/appSettingsShared';
import { hasRole, checkRolePermission } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';

function switchDispensaryInPath(pathname: string, newSlug: string): string {
  if (pathname.match(/^\/d\/[^/]+/)) {
    return pathname.replace(/^\/d\/[^/]+/, `/d/${encodeURIComponent(newSlug)}`);
  }
  return tenantRoutes(newSlug).employee.index;
}

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
    router.push(switchDispensaryInPath(pathname, newSlug));
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
      router.push(routes.admin.users);
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
            {session && accessibleDispensaries.length > 0 && (
              <Select
                aria-label="Dispensaire"
                data={accessibleDispensaries.map((d) => ({
                  value: d.slug,
                  label: d.name,
                }))}
                value={dispensarySlug ?? accessibleDispensaries[0]?.slug ?? null}
                onChange={handleDispensaryChange}
                allowDeselect={false}
                w={200}
                size="sm"
              />
            )}
          </Group>

          {session && t ? (
            <>
              <nav className={classes.headerNav} aria-label="Navigation principale">
                {isAdminOrManagementSpace && permissions?.application.management ? (
                  <Menu
                    width={260}
                    position="bottom-start"
                    transitionProps={{ transition: 'pop-top-left' }}
                    withinPortal
                  >
                    <Menu.Target>
                      <Button variant="subtle" className={classes.link}>
                        Actions de gestion
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Gestion</Menu.Label>
                      {appSettings.featurePayrollEnabled && permissions?.payrollReports.view && (
                        <Link href={t.employee.payroll}>
                          <Menu.Item>Rapports salaires</Menu.Item>
                        </Link>
                      )}
                      {appSettings.featureStockEnabled && permissions?.stockStatistics.view && (
                        <Link href={t.employee.stockStatistics}>
                          <Menu.Item>Statistiques de stock</Menu.Item>
                        </Link>
                      )}
                      <Link href={t.management.categoryItems}>
                        <Menu.Item>Catégories d&apos;objets</Menu.Item>
                      </Link>
                      <Link href={t.management.items}>
                        <Menu.Item>Objets</Menu.Item>
                      </Link>
                      <Link href={t.management.chests}>
                        <Menu.Item>Coffres</Menu.Item>
                      </Link>
                      <Link href={t.management.companyGroups}>
                        <Menu.Item>Groupes d&apos;entreprises</Menu.Item>
                      </Link>
                      <Link href={t.management.companies}>
                        <Menu.Item>Entreprises</Menu.Item>
                      </Link>
                      {appSettings.featureMailsEnabled && (
                        <Link href={t.management.mails}>
                          <Menu.Item>Courriers</Menu.Item>
                        </Link>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <>
                    {appSettings.featureBankEnabled &&
                      checkRolePermission(userRole, 'bank', 'access') && (
                        <Link
                          href={t.bank.index}
                          className={`${classes.link} ${isRouteActive(t.bank.index) ? classes.linkActive : ''}`}
                        >
                          Banque
                        </Link>
                      )}
                    {appSettings.featurePrivatePracticeEnabled &&
                      checkRolePermission(userRole, 'private_practice', 'access') && (
                        <Link
                          href={t.privatePractice.index}
                          className={`${classes.link} ${isRouteActive(t.privatePractice.index) ? classes.linkActive : ''}`}
                        >
                          Cabinet privé
                        </Link>
                      )}
                    {appSettings.featureWeeklyDispensaryActivityEnabled &&
                      permissions?.weeklyDispensaryActivity.view && (
                        <Link
                          href={t.weeklyActivity.index}
                          className={`${classes.link} ${isRouteActive(t.weeklyActivity.index) ? classes.linkActive : ''}`}
                        >
                          Activité hebdo
                        </Link>
                      )}
                    {appSettings.featureOrdersEnabled &&
                      checkRolePermission(userRole, 'orders', 'view') && (
                        <Link
                          href={t.orders.index}
                          className={`${classes.link} ${isRouteActive(t.orders.index) ? classes.linkActive : ''}`}
                        >
                          Commandes
                        </Link>
                      )}
                    {appSettings.featureStockEnabled &&
                      checkRolePermission(userRole, 'stock', 'view') && (
                        <Link
                          href={t.stock.index}
                          className={`${classes.link} ${isRouteActive(t.stock.index) ? classes.linkActive : ''}`}
                        >
                          Stocks
                        </Link>
                      )}
                    {appSettings.featurePayrollEnabled && permissions?.payrollReports.view && (
                      <Link
                        href={t.employee.payroll}
                        className={`${classes.link} ${isRouteActive(t.employee.payroll) ? classes.linkActive : ''}`}
                      >
                        Salaires
                      </Link>
                    )}
                    {appSettings.featureStockEnabled && permissions?.stockStatistics.view && (
                      <Link
                        href={t.employee.stockStatistics}
                        className={`${classes.link} ${isRouteActive(t.employee.stockStatistics) ? classes.linkActive : ''}`}
                      >
                        Stats stock
                      </Link>
                    )}
                  </>
                )}
                {(!isAdminOrManagementSpace || !permissions?.application.management) &&
                  appSettings.featureSearchEnabled &&
                  checkRolePermission(userRole, 'search', 'access') && (
                    <Link
                      href={t.searchItems.index}
                      className={`${classes.link} ${isRouteActive(t.searchItems.index) ? classes.linkActive : ''}`}
                      aria-label="Recherche"
                    >
                      <IconSearch size={20} />
                    </Link>
                  )}
              </nav>

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
                        <Link href={routes.platform.dispensaries}>
                          <Menu.Item>Dispensaires</Menu.Item>
                        </Link>
                        <Link href={routes.admin.users}>
                          <Menu.Item>Comptes utilisateurs</Menu.Item>
                        </Link>
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
              {isPlatformAdminUser && (
                <>
                  <Button component={Link} href={routes.admin.users} variant="light">
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
