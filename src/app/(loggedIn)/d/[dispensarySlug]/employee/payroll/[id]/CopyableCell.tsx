'use client';

import { ActionIcon, CopyButton, Group, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export function CopyableCell({
  value,
  children,
  copyFaded,
}: {
  value: string;
  children: ReactNode;
  copyFaded?: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copié' : 'Copier'} withArrow openDelay={100}>
            <ActionIcon
              variant="subtle"
              color="slate"
              size="sm"
              onClick={copy}
              aria-label="Copier"
              style={{
                opacity: copyFaded ? 0.5 : 1,
                transition: 'opacity 120ms ease',
              }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
