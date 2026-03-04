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
import { IconLogout } from '@tabler/icons-react';
import { usePermissions } from '@/app/_contexts/PermissionsContext';

export default function Header({
  session,
}: Readonly<{
  session: AuthSession | null;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const { permissions, userRole } = usePermissions();
  
  const isAdminSpace = pathname?.startsWith(routes.admin.index) || false;
  const isManagementSpace = pathname?.startsWith(routes.management.index) || false;
  const isAdminOrManagementSpace = isAdminSpace || isManagementSpace;
  
  const handleSpaceChange = (value: string) => {
    if (value === 'employee') {
      router.push(routes.stock.index);
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

  return (
    <header className={`${classes.header} mb-10`}>
      <Container size={'xl'}>
        <div className={'flex justify-between items-center w-full h-[60px]'}>
          <Link href={routes.stock.index}>
            <Image
              src="/logo_dispensaire.png"
              alt="Dispensaire Saint-Denis"
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
                {isAdminOrManagementSpace ? (
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
                      <Link href={routes.management.items}>
                        <Menu.Item>
                          Objets
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.categoryItems}>
                        <Menu.Item>
                          Catégories d'objets
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.companies}>
                        <Menu.Item>
                          Entreprises
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.companyGroups}>
                        <Menu.Item>
                          Groupes d'entreprises
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.chests}>
                        <Menu.Item>
                          Coffres
                        </Menu.Item>
                      </Link>
                      <Link href={routes.management.letterTemplates}>
                        <Menu.Item>
                          Templates de lettres
                        </Menu.Item>
                      </Link>
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <>
                    <Link
                      href={routes.stock.index}
                      className={classes.link}
                    >
                      Stocks
                    </Link>
                    <Link
                      href={routes.orders.index}
                      className={classes.link}
                    >
                      Commandes
                    </Link>
                    <Link
                      href={routes.searchItems.index}
                      className={classes.link}
                    >
                      Recherche
                    </Link>
                    <Link
                      href={routes.bank.index}
                      className={classes.link}
                    >
                      Banque
                    </Link>
                  </>
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
                  {userRole === 'admin' && (
                        <>
                          <Menu.Label>Admin</Menu.Label>
                          <Link href={routes.admin.users}>
                            <Menu.Item>
                              Gestion Utilisateur
                            </Menu.Item>
                          </Link>
                          <Link href={routes.admin.overwriteStock}>
                            <Menu.Item>
                              Écraser les stocks
                            </Menu.Item>
                          </Link>
                          <Menu.Divider />
                        </>
                      )}
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
