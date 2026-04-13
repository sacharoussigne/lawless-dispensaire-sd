'use client';

import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput, DatesProvider } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { IconArrowLeft, IconCalendarWeek, IconCoin, IconInfoCircle, IconTable } from '@tabler/icons-react';
import { createPayrollReportFromForm } from '@/app/_actions/payrollReports';
import { handleAction } from '@/lib/action';
import { PAYROLL_CAISSE_SALE_USD, PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { routes } from '@/types/routes';

const MAX_CAISSE_PRICE_USD = 1_000_000;

function SectionHeader({ icon: Icon, children }: { icon: typeof IconCalendarWeek; children: ReactNode }) {
  return (
    <Group gap={8} mb="md">
      <Icon size={18} stroke={1.5} style={{ opacity: 0.75 }} />
      <Text fw={600} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
        {children}
      </Text>
    </Group>
  );
}

export default function PayrollNewPageClient() {
  const router = useRouter();
  const [weekDate, setWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [caisseSalePriceUsd, setCaisseSalePriceUsd] = useState<number>(PAYROLL_CAISSE_SALE_USD);
  const [caissePriceUsd, setCaissePriceUsd] = useState<number>(PAYROLL_CAISSE_USD);
  const [tableHtml, setTableHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unitMarginUsd = useMemo(
    () => (Number.isFinite(caisseSalePriceUsd) && Number.isFinite(caissePriceUsd) ? caisseSalePriceUsd - caissePriceUsd : 0),
    [caisseSalePriceUsd, caissePriceUsd],
  );

  const htmlCharCount = tableHtml.length;

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
        title: 'Montant reversé invalide',
        message: `Indiquez un montant entre 0,01 et ${MAX_CAISSE_PRICE_USD.toLocaleString('fr-FR')} $.`,
        color: 'red',
      });
      return;
    }
    if (
      !Number.isFinite(caisseSalePriceUsd) ||
      caisseSalePriceUsd <= 0 ||
      caisseSalePriceUsd > MAX_CAISSE_PRICE_USD
    ) {
      notifications.show({
        title: 'Prix de vente invalide',
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
      fd.set('caisseSalePriceUsd', String(caisseSalePriceUsd));

      const result = await createPayrollReportFromForm(fd);
      const data = handleAction(result);

      notifications.show({
        title: 'Rapport créé',
        message: 'Analyse terminée.',
        color: 'green',
      });
      if (data?.report?.id) {
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
    <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
      <Container size={720} py={{ base: 'lg', sm: 'xl' }}>
        <Button
          component={Link}
          href={routes.admin.payroll}
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconArrowLeft size={16} stroke={1.5} />}
          mb="sm"
        >
          Rapports salaires
        </Button>

        <Title order={1} mb="xs">
          Nouveau rapport
        </Title>
        <Text size="sm" c="dimmed" maw={520} mb="xl">
          Indique la semaine de référence, les tarifs caisses puis colle le tableau HTML : le rapport calcule présences,
          caisses et montants de virement.
        </Text>

        <Stack gap="lg">
          <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md" shadow="xs">
            <SectionHeader icon={IconCalendarWeek}>Période</SectionHeader>
            <DateInput
              label="Date dans la semaine concernée"
              placeholder="JJ/MM/AAAA"
              value={weekDate}
              onChange={setWeekDate}
              maxDate={format(new Date(), 'yyyy-MM-dd')}
              valueFormat="DD/MM/YYYY"
              size="md"
              required
              clearable={false}
              popoverProps={{ withinPortal: true }}
            />
            <Text size="xs" c="dimmed" mt="sm">
              La plage « semaine du … au … » du rapport est dérivée automatiquement (lundi–dimanche, heure de Paris).
            </Text>
          </Paper>

          <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md" shadow="xs">
            <SectionHeader icon={IconCoin}>Tarifs caisses (USD)</SectionHeader>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 'md', sm: 'lg' }}>
              <NumberInput
                label="Prix de vente dispensaire"
                description="Ce que le dispensaire facture par caisse."
                min={0.01}
                max={MAX_CAISSE_PRICE_USD}
                step={0.5}
                decimalScale={2}
                suffix=" $"
                size="md"
                value={caisseSalePriceUsd}
                onChange={(v) => {
                  if (v === '' || v === undefined) return;
                  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) setCaisseSalePriceUsd(n);
                }}
              />
              <NumberInput
                label="Montant reversé à l&apos;employé"
                description="Montant unitaire par caisse pour les virements."
                min={0.01}
                max={MAX_CAISSE_PRICE_USD}
                step={0.5}
                decimalScale={2}
                suffix=" $"
                size="md"
                value={caissePriceUsd}
                onChange={(v) => {
                  if (v === '' || v === undefined) return;
                  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) setCaissePriceUsd(n);
                }}
              />
            </SimpleGrid>
            <Text size="sm" mt="md">
              <Text span c="dimmed">
                Marge unitaire (vente − reversé)&nbsp;:{' '}
              </Text>
              <Text span fw={600} c={unitMarginUsd < 0 ? 'orange' : undefined}>
                {unitMarginUsd.toFixed(2)} $
              </Text>
            </Text>
          </Paper>

          <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md" shadow="xs">
            <SectionHeader icon={IconTable}>Tableau HTML</SectionHeader>
            <Alert variant="light" color="gray" icon={<IconInfoCircle size={18} />} mb="md" radius="sm">
              Colle la balise <Text span ff="monospace" size="xs">{`<table>…</table>`}</Text> telle qu’exportée. Le parse
              attend les colonnes habituelles (rôle, jours, etc.) du tableau salaires.
            </Alert>
            <Textarea
              label="Source HTML"
              description={`${htmlCharCount.toLocaleString('fr-FR')} caractère${htmlCharCount === 1 ? '' : 's'}`}
              placeholder="<table>...</table>"
              value={tableHtml}
              onChange={(e) => setTableHtml(e.currentTarget.value)}
              minRows={12}
              autosize
              maxRows={28}
              size="md"
              styles={{
                input: {
                  fontFamily: 'var(--mantine-font-family-monospace)',
                  fontSize: 'var(--mantine-font-size-xs)',
                  lineHeight: 1.5,
                },
              }}
            />
          </Paper>

          <Box pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text size="xs" c="dimmed" visibleFrom="sm">
                Les montants pourront encore être ajustés après création sur la fiche du rapport.
              </Text>
              <Group gap="sm" ml="auto">
                <Button variant="default" component={Link} href={routes.admin.payroll} disabled={submitting}>
                  Annuler
                </Button>
                <Button loading={submitting} onClick={handleSubmit}>
                  Enregistrer le rapport
                </Button>
              </Group>
            </Group>
          </Box>
        </Stack>
      </Container>
    </DatesProvider>
  );
}
