import type { ReactNode } from 'react';
import Link from 'next/link';
import { Group, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import classes from './PageHeader.module.scss';

export type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Retour',
  actions,
}: PageHeaderProps) {
  return (
    <header className={classes.root}>
      {backHref && (
        <Link href={backHref} className={classes.backLink}>
          <IconArrowLeft size={16} stroke={1.6} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {backLabel}
        </Link>
      )}

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md" mt={backHref ? 'sm' : 0}>
        <div>
          <h1 className={classes.title}>{title}</h1>
          {description && <Text className={classes.description}>{description}</Text>}
        </div>
        {actions && <div>{actions}</div>}
      </Group>

      <hr className={`disp-section-divider ${classes.divider}`} />
    </header>
  );
}
