'use client';

import Link from 'next/link';
import {
  Burger,
  Button,
  Drawer,
  Group,
  Menu,
  Stack,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconAdjustments, IconChevronDown } from '@tabler/icons-react';
import classes from './Header.module.scss';
import {
  getEmployeeNavItems,
  type EmployeeNavItem,
} from '@/lib/navigation/employeeNav';
import { getManagementNavItems } from '@/lib/navigation/managementNav';
import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import type { Permissions } from '@/types/permissions';
import type { tenantRoutes } from '@/types/routes';

function NavLinkItem({
  item,
  isActive,
  compact,
}: {
  item: EmployeeNavItem;
  isActive: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <Group gap={6} wrap="nowrap">
      <Icon size={18} stroke={1.6} />
      {!item.iconOnly && !compact && <span>{item.shortLabel}</span>}
      {!item.iconOnly && compact && <span>{item.shortLabel}</span>}
    </Group>
  );

  const link = (
    <Link
      href={item.href}
      className={`${classes.link} ${isActive ? classes.linkActive : ''}`}
      aria-label={item.iconOnly ? item.label : undefined}
    >
      {content}
    </Link>
  );

  if (item.iconOnly) {
    return (
      <Tooltip label={item.label} position="bottom">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function HeaderNavLinks({
  t,
  appSettings,
  permissions,
  userRole,
  isManagementSpace,
  canManage,
  isRouteActive,
}: {
  t: ReturnType<typeof tenantRoutes>;
  appSettings: AppSettingsDTO;
  permissions: Permissions | null;
  userRole: string | null;
  isManagementSpace: boolean;
  canManage: boolean;
  isRouteActive: (route: string) => boolean;
}) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 62em)');

  if (isManagementSpace && canManage) {
    const managementItems = getManagementNavItems(t, appSettings);
    return (
      <nav className={classes.headerNav} aria-label="Navigation principale">
        <Menu
          width={260}
          position="bottom-start"
          transitionProps={{ transition: 'pop-top-left' }}
          withinPortal
        >
          <Menu.Target>
            <Button
              variant="subtle"
              className={classes.link}
              leftSection={<IconAdjustments size={18} stroke={1.6} />}
              rightSection={<IconChevronDown size={14} />}
            >
              Gestion
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Actions de gestion</Menu.Label>
            {managementItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Menu.Item>{item.label}</Menu.Item>
              </Link>
            ))}
          </Menu.Dropdown>
        </Menu>
      </nav>
    );
  }

  const { primary, more } = getEmployeeNavItems({
    t,
    appSettings,
    permissions,
    userRole,
  });

  const renderItem = (item: EmployeeNavItem) => (
    <NavLinkItem
      key={item.id}
      item={item}
      isActive={isRouteActive(item.href)}
      compact={isMobile}
    />
  );

  if (isMobile) {
    return (
      <>
        <Burger
          opened={drawerOpened}
          onClick={toggleDrawer}
          aria-label="Menu de navigation"
          size="sm"
          className={classes.burger}
        />
        <Drawer
          opened={drawerOpened}
          onClose={closeDrawer}
          title="Navigation"
          position="left"
          size="xs"
          classNames={{ title: 'disp-display-title' }}
        >
          <Stack gap="xs" onClick={closeDrawer}>
            {[...primary, ...more].map((item) => {
              const Icon = item.icon;
              return (
                <UnstyledButton
                  key={item.id}
                  component={Link}
                  href={item.href}
                  className={`${classes.drawerLink} ${isRouteActive(item.href) ? classes.drawerLinkActive : ''}`}
                >
                  <Group gap="sm">
                    <Icon size={20} stroke={1.6} />
                    <span>{item.label}</span>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Drawer>
      </>
    );
  }

  return (
    <nav className={classes.headerNav} aria-label="Navigation principale">
      {primary.map(renderItem)}
      {more.length > 0 && (
        <Menu
          width={220}
          position="bottom"
          withinPortal
          transitionProps={{ transition: 'pop' }}
        >
          <Menu.Target>
            <Button
              variant="subtle"
              className={classes.link}
              rightSection={<IconChevronDown size={14} />}
            >
              Plus
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {more.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href}>
                  <Menu.Item leftSection={<Icon size={16} stroke={1.6} />}>
                    {item.label}
                  </Menu.Item>
                </Link>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      )}
    </nav>
  );
}
