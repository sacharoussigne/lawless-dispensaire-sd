'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { Button, Group } from '@mantine/core';
import { IconArrowLeft, IconCopy, IconCheck } from '@tabler/icons-react';

import { useRouter } from 'next/navigation';

interface TemplateFormHeaderProps {
  content: string;
  copied: boolean;
  loading: boolean;
  submitLabel: string;
  formId: string;
  onCopy: () => void;
}

export function TemplateFormHeader({
  content,
  copied,
  loading,
  submitLabel,
  formId,
  onCopy,
}: TemplateFormHeaderProps) {
  const routes = useTenantRoutes();
  const router = useRouter();

  return (
    <Group justify="space-between">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.push(routes.employee.mails + '?tab=templates')}
      >
        Retour
      </Button>
      <Group>
        {content && (
          <Button
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={onCopy}
            variant={copied ? 'light' : 'default'}
            color={copied ? 'green' : undefined}
          >
            {copied ? 'Copiée !' : 'Copier le template'}
          </Button>
        )}
        <Button type="submit" loading={loading} form={formId}>
          {submitLabel}
        </Button>
      </Group>
    </Group>
  );
}
