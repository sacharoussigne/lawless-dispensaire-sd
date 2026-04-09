'use client';

import {
  Button,
  Container,
  Group,
  NumberInput,
  Stack,
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
import { PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { routes } from '@/types/routes';

const MAX_CAISSE_PRICE_USD = 1_000_000;

export default function PayrollNewPageClient() {
  const router = useRouter();
  const [weekDate, setWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [caissePriceUsd, setCaissePriceUsd] = useState<number>(PAYROLL_CAISSE_USD);
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
    if (
      !Number.isFinite(caissePriceUsd) ||
      caissePriceUsd <= 0 ||
      caissePriceUsd > MAX_CAISSE_PRICE_USD
    ) {
      notifications.show({
        title: 'Prix caisse invalide',
        message: `Indiquez un montant entre 0,01 et ${MAX_CAISSE_PRICE_USD.toLocaleString('fr-FR')} $.`,
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('weekStart', weekStart);
      fd.set('tableHtml', tableHtml);
      fd.set('caissePriceUsd', String(caissePriceUsd));

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

          <NumberInput
            label="Prix caisse ($)"
            description={`Montant unitaire pour tout le rapport.`}
            min={0.01}
            max={MAX_CAISSE_PRICE_USD}
            step={0.5}
            decimalScale={2}
            value={caissePriceUsd}
            onChange={(v) => {
              if (v === '' || v === undefined) return;
              const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
              if (Number.isFinite(n) && n > 0) setCaissePriceUsd(n);
            }}
          />

          <Textarea
            label="HTML du tableau"
            description="Collez la source HTML (balise table et contenu) telle qu’exportée ou copiée."
            placeholder="<table>...</table>"
            value={tableHtml}
            onChange={(e) => setTableHtml(e.currentTarget.value)}
            minRows={14}
            autosize
            maxRows={14}
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
