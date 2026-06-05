'use client';

import type { ReactNode } from 'react';
import { Group, Modal, Stack, Text } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import classes from './AppModal.module.scss';

export type AppModalProps = {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: Icon;
  size?: string | number;
  children: ReactNode;
  footer?: ReactNode;
};

export function AppModal({
  opened,
  onClose,
  title,
  description,
  icon: IconComponent,
  size = 'lg',
  children,
  footer,
}: AppModalProps) {
  const modalTitle = (
    <div>
      {IconComponent && (
        <Group gap="sm" mb={description ? 'xs' : 0}>
          <IconComponent size={22} stroke={1.6} color="var(--disp-sage)" />
          <span className="modal-title">{title}</span>
        </Group>
      )}
      {!IconComponent && <span className="modal-title">{title}</span>}
      {description && <Text className={classes.description}>{description}</Text>}
    </div>
  );

  return (
    <Modal opened={opened} onClose={onClose} title={modalTitle} size={size} classNames={{ title: 'modal-title' }}>
      <Stack gap="md">
        {children}
        {footer && <div className={classes.footer}>{footer}</div>}
      </Stack>
    </Modal>
  );
}

export function AppModalFooter({
  children,
  align = 'flex-end',
}: {
  children: ReactNode;
  align?: 'flex-end' | 'space-between';
}) {
  return (
    <Group justify={align} gap="sm">
      {children}
    </Group>
  );
}
