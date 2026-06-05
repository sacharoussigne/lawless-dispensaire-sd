import type { ReactNode } from 'react';
import { Stack } from '@mantine/core';
import classes from './AppModal.module.scss';

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="sm" className={classes.section}>
      <div className={classes.sectionLabel}>{title}</div>
      {children}
    </Stack>
  );
}
