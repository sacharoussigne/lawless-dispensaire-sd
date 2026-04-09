'use client';

import {
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput, DatesProvider } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { IconArrowLeft } from '@tabler/icons-react';
import { routes } from '@/types/routes';

export default function PayrollNewPageClient() {
  const router = useRouter();
  const [weekDate, setWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [tableHtml, setTableHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const weekStart = weekDate;
    if (!weekStart) {
      notifications.show({ title: 'Date requise', message: 'Choisissez une date dans la semaine.', color: 'red' });
      return;
    }
    if (!tableHtml.trim()) {
      notifications.show({
        title: 'Contenu requis',
        message: 'Collez le HTML du tableau (copié depuis le jeu ou l’éditeur).',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('weekStart', weekStart);
      fd.set('tableHtml', tableHtml);

      const res = await fetch('/api/payroll-reports', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Échec de la création');
      }

      notifications.show({
        title: 'Rapport créé',
        message: 'Analyse terminée.',
        color: 'green',
      });
      if (data.report?.id) {
        router.push(`${routes.admin.payroll}/${data.report.id}`);
      } else {
        router.push(routes.admin.payroll);
      }
      router.refresh();
    } catch (e: unknown) {
      notifications.show({
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DatesProvider settings={{ locale: 'fr' }}>
      <Container size="md" py="xl">
        <Button
          component={Link}
          href={routes.admin.payroll}
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconArrowLeft size={16} stroke={1.5} />}
          mb="xs"
        >
          Rapports salaires
        </Button>
        <Title order={1} mb="md">
          Nouveau rapport
        </Title>
        <Paper withBorder p="md" radius="md" mb="lg" bg="var(--mantine-color-body)">
          <Text size="sm" c="dimmed">
            Choisissez un jour de la semaine concernée (le lundi sera déduit automatiquement), puis collez le HTML du
            tableau des présences et caisses. Le contenu est parsé côté serveur et enregistré au format JSON attendu
            (limite {600_000} caractères côté API).
          </Text>
        </Paper>

        <Stack gap="lg">
          <DateInput
            label="Semaine (référence)"
            placeholder="Choisir une date"
            value={weekDate}
            onChange={setWeekDate}
            maxDate={format(new Date(), 'yyyy-MM-dd')}
            valueFormat="DD/MM/YYYY"
            required
          />

          <Textarea
            label="HTML du tableau"
            description="Collez la source HTML (balise table et contenu) telle qu’exportée ou copiée."
            placeholder="<table>...</table>"
            value={tableHtml}
            onChange={(e) => setTableHtml(e.currentTarget.value)}
            minRows={14}
            autosize
            maxRows={18}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          />

          <Group justify="flex-end">
            <Button variant="default" component={Link} href={routes.admin.payroll}>
              Annuler
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Enregistrer le rapport
            </Button>
          </Group>
        </Stack>
      </Container>
    </DatesProvider>
  );
}
