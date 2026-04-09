'use client';

import {
  Avatar,
  Button,
  Container,
  Group,
  Menu,
  SegmentedControl,
  UnstyledButton,
} from '@mantine/core';
import classes from './Header.module.scss';
import { authClient } from '@/lib/client';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthSession } from '@/types/session';
import { routes } from '@/types/routes';
import Link from 'next/link';
import Image from 'next/image';
import { IconLogout, IconSearch, IconSettings } from '@tabler/icons-react';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { dispensarySiteTitle } from '@/lib/appSettingsShared';
import { hasRole, checkRolePermission } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';

export default function Header({
  session,
}: Readonly<{
  session: AuthSession | null;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const { permissions, userRole, appSettings } = usePermissions();

  const isAdminSpace = pathname?.startsWith(routes.admin.index) || false;
  const isManagementSpace = pathname?.startsWith(routes.management.index) || false;
  const isAdminOrManagementSpace = isAdminSpace || isManagementSpace;

  const handleSpaceChange = (value: string) => {
    if (value === 'employee') {
      router.push(routes.employee.index);
    } else if (value === 'management') {
      router.push(routes.management.index);
    }
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

  // Determine if user can see SegmentedControl
  // Only if user has management permission (access to admin space)
  const canSwitchSpaces = permissions?.application.management === true;

  // Check if a route is active
  const isRouteActive = (route: string) => {
    if (!pathname) return false;
    // Exact match
    if (pathname === route) return true;
    // Starts with route + '/' (for sub-routes)
    if (pathname.startsWith(`${route}/`)) return true;
    return false;
  };

  return (
    <header className={`${classes.header} mb-10`}>
      <Container size={'xl'}>
        <div className={'flex justify-between items-center w-full h-[60px]'}>
          <Link
            href={isManagementSpace ? routes.management.index : routes.employee.index}
            className={classes.logoLink}
          >
            <Image
              src="/logo_dispensaire.png"
              alt={dispensarySiteTitle(appSettings)}
              width={50}
              height={50}
              className="rounded-full"
              style={{ borderRadius: '50%' }}
            />
          </Link>

          {session && <div className="flex gap-4"></div>}

          <Group>
            {session ? (
              <>
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
                        <Link href={routes.admin.payroll}>
                          <Menu.Item>
                            Rapports salaires
                          </Menu.Item>
                        </Link>
                      )}
                      <Link href={routes.management.categoryItems}>
                        <Menu.Item>
                          Catégories d'objets
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.items}>
                        <Menu.Item>
                          Objets
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.chests}>
                        <Menu.Item>
                          Coffres
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.companyGroups}>
                        <Menu.Item>
                          Groupes d'entreprises
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.companies}>
                        <Menu.Item>
                          Entreprises
                        </Menu.Item>
                      </Link>
                      {appSettings.featureMailsEnabled && (
                        <Link href={routes.management.mails}>
                          <Menu.Item>
                            Courriers
                          </Menu.Item>
                        </Link>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <>
                    {appSettings.featureBankEnabled &&
                      checkRolePermission(userRole, 'bank', 'access') && (
                        <Link
                          href={routes.bank.index}
                          className={`${classes.link} ${isRouteActive(routes.bank.index) ? classes.linkActive : ''}`}
                        >
                          Banque
                        </Link>
                      )}
                    {appSettings.featurePrivatePracticeEnabled &&
                      checkRolePermission(userRole, 'private_practice', 'access') && (
                        <Link
                          href={routes.privatePractice.index}
                          className={`${classes.link} ${isRouteActive(routes.privatePractice.index) ? classes.linkActive : ''}`}
                        >
                          Cabinet privé
                        </Link>
                      )}
                    {appSettings.featureOrdersEnabled &&
                      checkRolePermission(userRole, 'orders', 'view') && (
                        <Link
                          href={routes.orders.index}
                          className={`${classes.link} ${isRouteActive(routes.orders.index) ? classes.linkActive : ''}`}
                        >
                          Commandes
                        </Link>
                      )}
                    {appSettings.featureStockEnabled &&
                      checkRolePermission(userRole, 'stock', 'view') && (
                        <Link
                          href={routes.stock.index}
                          className={`${classes.link} ${isRouteActive(routes.stock.index) ? classes.linkActive : ''}`}
                        >
                          Stocks
                        </Link>
                      )}
                  </>
                )}
                {/* Search icon: employee space or payroll-only (Direction) */}
                {(!isAdminOrManagementSpace || !permissions?.application.management) &&
                  appSettings.featureSearchEnabled &&
                  checkRolePermission(userRole, 'search', 'access') && (
                    <Link
                      href={routes.searchItems.index}
                      className={`${classes.link} ${isRouteActive(routes.searchItems.index) ? classes.linkActive : ''}`}
                      aria-label="Recherche"
                    >
                      <IconSearch size={20} />
                    </Link>
                  )}
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
                    <UnstyledButton
                      className={`user ${userMenuOpened ? 'userActive' : ''}`}
                    >
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
                    {hasRole(userRole, Role.ADMIN) && (
                      <>
                        <Menu.Label>Admin</Menu.Label>
                        <Link href={routes.admin.users}>
                          <Menu.Item>
                            Gestion Utilisateur
                          </Menu.Item>
                        </Link>
                        {appSettings.featureStockEnabled && (
                          <Link href={routes.admin.overwriteStock}>
                            <Menu.Item>
                              Écraser les stocks
                            </Menu.Item>
                          </Link>
                        )}
                        <Link href={routes.admin.settings}>
                          <Menu.Item>
                            Paramètres application
                          </Menu.Item>
                        </Link>
                        <Menu.Divider />
                      </>
                    )}
                    <Link href={routes.settings.index}>
                      <Menu.Item leftSection={<IconSettings size={16} stroke={1.5} />}>
                        Paramètres
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
              </>
            ) : (
              <>
                <Button variant="default">Se connecter</Button>
                <Button>S'inscrire</Button>
              </>
            )}
          </Group>
        </div>
      </Container>
    </header>
  );
}
