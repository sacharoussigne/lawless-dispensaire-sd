import Link from 'next/link';
import { Button, Card, Group, Text } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import classes from './ModuleCard.module.scss';

export type ModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: Icon;
};

export function ModuleCard({ title, description, href, icon: IconComponent }: ModuleCardProps) {
  return (
    <Card withBorder shadow="sm" radius="md" padding="lg" className={classes.card}>
      <Group mb="md" align="flex-start" wrap="nowrap">
        <div className={classes.iconMedallion}>
          <IconComponent size={24} stroke={1.6} />
        </div>
        <div>
          <Text className={classes.title}>{title}</Text>
          <Text size="sm" className={classes.description} mt={4}>
            {description}
          </Text>
        </div>
      </Group>

      <Group justify="flex-end" mt="md">
        <Link href={href} className={classes.accessLink}>
          <Button variant="filled" color="sage">
            Accéder
          </Button>
        </Link>
      </Group>
    </Card>
  );
}
