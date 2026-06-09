'use client';

import Link from 'next/link';
import {
  Burger,
  Drawer,
  Group,
  Menu,
  Stack,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import classes from './Header.module.scss';
import {
  getEmployeeNavItems,
  type EmployeeNavItem,
} from '@/lib/navigation/employeeNav';
import {
  getManagementNavItems,
  type ManagementNavItem,
} from '@/lib/navigation/managementNav';
import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import type { Permissions } from '@/types/permissions';
import type { tenantRoutes } from '@/types/routes';

type HeaderNavLinkItem = EmployeeNavItem | ManagementNavItem;

function NavLinkItem({
  item,
  isActive,
  compact,
}: {
  item: HeaderNavLinkItem;
  isActive: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <Group gap={6} wrap="nowrap" className={classes.linkInner}>
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
  agendaModuleAccess,
  isManagementSpace,
  canManage,
  isRouteActive,
}: {
  t: ReturnType<typeof tenantRoutes>;
  appSettings: AppSettingsDTO;
  permissions: Permissions | null;
  userRole: string | null;
  agendaModuleAccess: boolean;
  isManagementSpace: boolean;
  canManage: boolean;
  isRouteActive: (route: string) => boolean;
}) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 62em)');

  if (isManagementSpace && canManage) {
    const { primary, more } = getManagementNavItems(t, appSettings);

    const renderManagementItem = (item: ManagementNavItem) => (
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
            title="Gestion"
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
      <nav className={classes.headerNav} aria-label="Navigation gestion">
        {primary.map(renderManagementItem)}
        {more.length > 0 && (
          <Menu
            width={260}
            position="bottom"
            withinPortal
            transitionProps={{ transition: 'pop' }}
          >
            <Menu.Target>
              <UnstyledButton className={classes.link}>
                <Group gap={4} wrap="nowrap" className={classes.linkInner}>
                  <span>Plus</span>
                  <IconChevronDown size={14} stroke={1.6} />
                </Group>
              </UnstyledButton>
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

  const { primary, more } = getEmployeeNavItems({
    t,
    appSettings,
    permissions,
    userRole,
    agendaModuleAccess,
  });

  const renderItem = (item: HeaderNavLinkItem) => (
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
            <UnstyledButton className={classes.link}>
              <Group gap={4} wrap="nowrap" className={classes.linkInner}>
                <span>Plus</span>
                <IconChevronDown size={14} stroke={1.6} />
              </Group>
            </UnstyledButton>
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
