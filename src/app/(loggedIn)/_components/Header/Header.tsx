'use client';

import {
  Avatar,
  Button,
  Container,
  Group,
  Menu,
  UnstyledButton,
} from '@mantine/core';
import classes from './Header.module.scss';
import { authClient } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthSession } from '@/types/session';
import { routes } from '@/types/routes';
import Link from 'next/link';
import { IconSettings, IconLogout } from '@tabler/icons-react';

export default function Header({
  session,
}: Readonly<{
  session: AuthSession | null;
}>) {
  const router = useRouter();
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  return (
      <header className={`${classes.header} mb-10`}>
        <Container size={'lg'}>
          <div className={'flex justify-between items-center w-full h-[60px]'}>
            <h1 className="text-2xl font-bold">
              <Link href={routes.test.index}>
                <div className="flex items-center gap-2">
                  Dispensaire Saint-Denis
                </div>
              </Link>
            </h1>

            {session && <div className="flex gap-4"></div>}

            <Group>
              {session ? (
                <>
                  <Link
                    href={routes.stock.index}
                    className={classes.link}
                  >
                    Stocks
                  </Link>
                  <Link
                    href={routes.test.index}
                    className={classes.link}
                  >
                    Commandes
                  </Link>
                  <Link
                    href={routes.test.index}
                    className={classes.link}
                  >
                    Compte
                  </Link>
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
                      <Menu.Label>Settings</Menu.Label>
                      <Link href={routes.settings.index}>
                        <Menu.Item
                          leftSection={<IconSettings size={16} stroke={1.5} />}
                        >
                          Settings
                        </Menu.Item>
                      </Link>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconLogout size={16} stroke={1.5} />}
                        onClick={handleLogout}
                      >
                        Logout
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </>
              ) : (
                <>
                  <Button variant="default">Log in</Button>
                  <Button>Sign up</Button>
                </>
              )}
            </Group>
          </div>
        </Container>
      </header>
  );
}
