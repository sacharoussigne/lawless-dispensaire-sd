'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';


export default function PayrollNewReportButton() {
  const routes = useTenantRoutes();
  return (
    <Button
      component={Link}
      href={routes.admin.payrollNew}
      leftSection={<IconPlus size={18} />}
    >
      Nouveau rapport
    </Button>
  );
}
