'use client';

import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { routes } from '@/types/routes';

export default function PayrollNewReportButton() {
  return (
    <Button
      component={Link}
      href={routes.employee.payrollNew}
      leftSection={<IconPlus size={18} />}
    >
      Nouveau rapport
    </Button>
  );
}

