'use client';

import { Group, UnstyledButton, Stack, Text } from '@mantine/core';
import { IconBookmarkFilled, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { routes } from '@/types/routes';
import { AuthSession } from '@/types/session';
import classes from './BottomBar.module.scss';
import { usePathname } from 'next/navigation';

interface BottomBarProps {
  session: AuthSession | null;
}

export default function BottomBar({ session }: Readonly<BottomBarProps>) {
  if (!session) return null;

  const pathname = usePathname();

  return (
    <div className={classes.bottomBar}>
      <Group justify="space-around" w="100%" hiddenFrom="sm">
        <Link href={routes.stock.index}>
          <UnstyledButton className={classes.bottomBarButton}>
            <Stack align="center" gap={5}>
              <IconBookmarkFilled
                size={24}
                stroke={1.5}
                color={pathname.startsWith(routes.stock.index) ? 'blue' : 'gray'}
              />
              <Text
                size="xs"
                c={pathname.startsWith(routes.stock.index) ? 'blue' : 'gray'}
              >
                Test
              </Text>
            </Stack>
          </UnstyledButton>
        </Link>

        <Link href={routes.settings.index}>
          <UnstyledButton className={classes.bottomBarButton}>
            <Stack align="center" gap={5}>
              <IconUser
                size={24}
                stroke={1.5}
                color={
                  pathname.startsWith(routes.settings.index) ? 'blue' : 'gray'
                }
              />
              <Text
                size="xs"
                c={pathname.startsWith(routes.settings.index) ? 'blue' : 'gray'}
              >
                Profile
              </Text>
            </Stack>
          </UnstyledButton>
        </Link>
      </Group>
    </div>
  );
}
