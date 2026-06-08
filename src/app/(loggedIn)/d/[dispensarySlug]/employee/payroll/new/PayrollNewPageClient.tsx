'use client';

import { usePermissions, useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  NumberInput,
  Paper,
  Select,
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  IconArrowLeft,
  IconCalendarWeek,
  IconCoin,
  IconInfoCircle,
  IconTable,
} from '@tabler/icons-react';
import {
  createPayrollReportFromForm,
  listPayrollImportableActivityWeeks,
} from '@/app/_actions/payrollReports';
import { handleAction } from '@/lib/action';
import {
  PAYROLL_CAISSE_SALE_USD,
  PAYROLL_CAISSE_USD,
  PAYROLL_OFFERED_ITEM_USD,
  PAYROLL_PATIENT_CARE_USD,
  PAYROLL_REPORT_TYPE_EMPLOYES,
  PAYROLL_REPORT_TYPES,
} from '@/lib/payroll/constants';


const MAX_CAISSE_PRICE_USD = 1_000_000;

const REPORT_TYPE_SELECT_DATA = PAYROLL_REPORT_TYPES.map((t) => ({ value: t, label: t }));

function SectionHeader({
  icon: Icon,
  children,
}: {
  icon: typeof IconCalendarWeek;
  children: ReactNode;
}) {
  return (
    <Group gap={8} mb="md">
      <Icon size={18} stroke={1.5} style={{ opacity: 0.75 }} />
      <Text
        fw={600}
        size="sm"
        tt="uppercase"
        c="dimmed"
        style={{ letterSpacing: '0.04em' }}
      >
        {children}
      </Text>
    </Group>
  );
}

export default function PayrollNewPageClient() {
  const routes = useTenantRoutes();
  const { dispensarySlug } = usePermissions();
  const router = useRouter();
  const [weekDate, setWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [importWeeklyActivity, setImportWeeklyActivity] = useState(false);
  const [waWeekDate, setWaWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [caisseSalePriceUsd, setCaisseSalePriceUsd] = useState<number>(PAYROLL_CAISSE_SALE_USD);
  const [caissePriceUsd, setCaissePriceUsd] = useState<number>(PAYROLL_CAISSE_USD);
  const [patientCarePriceUsd, setPatientCarePriceUsd] =
    useState<number>(PAYROLL_PATIENT_CARE_USD);
  const [offeredItemPriceUsd, setOfferedItemPriceUsd] =
    useState<number>(PAYROLL_OFFERED_ITEM_USD);
  const [tableHtml, setTableHtml] = useState('');
  const [reportType, setReportType] = useState<string>(PAYROLL_REPORT_TYPE_EMPLOYES);
  const [submitting, setSubmitting] = useState(false);
  const [knownWaWeeks, setKnownWaWeeks] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listPayrollImportableActivityWeeks(dispensarySlug!, );
      if (cancelled || res.status !== 200 || !('data' in res)) return;
      const w = (res as {
        data: { weeks: { weekStart: string; periodStart: string; periodEnd: string }[] };
      }).data.weeks;
      setKnownWaWeeks(
        w.map((row) => ({
          value: row.weekStart,
          label: `Semaine ${row.weekStart} → ${row.periodEnd.slice(0, 10)}`,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unitMarginUsd = useMemo(
    () =>
      Number.isFinite(caisseSalePriceUsd) && Number.isFinite(caissePriceUsd)
        ? caisseSalePriceUsd - caissePriceUsd
        : 0,
    [caisseSalePriceUsd, caissePriceUsd],
  );

  const htmlCharCount = tableHtml.length;

  const handleSubmit = async () => {
    const weekStart = weekDate;
    if (!weekStart) {
      notifications.show({
        title: 'Date requise',
        message: 'Choisissez une date dans la semaine.',
        color: 'red',
      });
      return;
    }
    if (!importWeeklyActivity && !tableHtml.trim()) {
      notifications.show({
        title: 'Données manquantes',
        message: 'Sans import weekly activity, collez le HTML du tableau des salaires.',
        color: 'red',
      });
      return;
    }
    if (!Number.isFinite(caissePriceUsd) || caissePriceUsd <= 0 || caissePriceUsd > MAX_CAISSE_PRICE_USD) {
      notifications.show({
        title: 'Montant reversé invalide',
        message: `Indiquez un montant entre 0,01 et ${MAX_CAISSE_PRICE_USD.toLocaleString('fr-FR')} $.`,
        color: 'red',
      });
      return;
    }
    if (!Number.isFinite(caisseSalePriceUsd) || caisseSalePriceUsd <= 0 || caisseSalePriceUsd > MAX_CAISSE_PRICE_USD) {
      notifications.show({
        title: 'Prix de vente invalide',
        message: `Indiquez un montant entre 0,01 et ${MAX_CAISSE_PRICE_USD.toLocaleString('fr-FR')} $.`,
        color: 'red',
      });
      return;
    }
    if (
      !Number.isFinite(patientCarePriceUsd) ||
      patientCarePriceUsd <= 0 ||
      patientCarePriceUsd > MAX_CAISSE_PRICE_USD
    ) {
      notifications.show({
        title: 'Prix par patient invalide',
        message: `Indiquez un montant entre 0,01 et ${MAX_CAISSE_PRICE_USD.toLocaleString('fr-FR')} $.`,
        color: 'red',
      });
      return;
    }
    if (
      !Number.isFinite(offeredItemPriceUsd) ||
      offeredItemPriceUsd <= 0 ||
      offeredItemPriceUsd > MAX_CAISSE_PRICE_USD
    ) {
      notifications.show({
        title: "Prix d'offre invalide",
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
      fd.set('patientCarePriceUsd', String(patientCarePriceUsd));
      fd.set('offeredItemPriceUsd', String(offeredItemPriceUsd));
      fd.set('reportType', reportType);
      if (importWeeklyActivity) {
        fd.set('importWeeklyActivity', '1');
        fd.set('weeklyActivityWeekStart', waWeekDate ?? weekStart);
      } else {
        fd.set('importWeeklyActivity', '0');
      }

      const result = await createPayrollReportFromForm(dispensarySlug!, fd);
      const data = handleAction(result);

      notifications.show({
        title: 'Rapport créé',
        message: 'Analyse terminée.',
        color: 'green',
      });

      const reportId = data?.report?.id ? String(data.report.id) : null;
      router.push(reportId ? routes.employee.payrollDetail(reportId) : routes.employee.payroll);
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
          href={routes.employee.payroll}
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
          Semaine, tarifs, fusion activité Discord (optionnel), tableau HTML obligatoire si pas d’import.
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
              autoComplete="off"
              data-dashlane-ignore="true"
            />
            <Text size="xs" c="dimmed" mt="sm">
              La plage « semaine du … au … » du rapport est dérivée automatiquement (lundi–dimanche, heure
              de Paris).
            </Text>
            <Select
              label="Type de rapport"
              description="Vous pouvez créer un second rapport sur la même semaine avec un type différent."
              data={REPORT_TYPE_SELECT_DATA}
              value={reportType}
              onChange={(v) => setReportType(v ?? PAYROLL_REPORT_TYPE_EMPLOYES)}
              size="md"
              mt="md"
              allowDeselect={false}
            />
          </Paper>

          <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md" shadow="xs">
            <SectionHeader icon={IconCalendarWeek}>Import de l'activité hebdomadaire</SectionHeader>
            <Checkbox
              label="Importer et fusionner l’activité hebdomadaire (Discord / intranet)"
              description="Désactivé : uniquement le tableau HTML, sans requête sur les données d’activité."
              checked={importWeeklyActivity}
              onChange={(e) => setImportWeeklyActivity(e.currentTarget.checked)}
              mb="md"
            />
            {importWeeklyActivity && (
              <>
                <DateInput
                  label="Date dans la semaine à importer"
                  description="Semaine de référence pour charger les entrées d’activité (lundi–dimanche, Paris). Par défaut : même que le rapport."
                  placeholder="JJ/MM/AAAA"
                  value={waWeekDate}
                  onChange={setWaWeekDate}
                  maxDate={format(new Date(), 'yyyy-MM-dd')}
                  valueFormat="DD/MM/YYYY"
                  size="md"
                  clearable={false}
                  popoverProps={{ withinPortal: true }}
                  autoComplete="off"
                  data-dashlane-ignore="true"
                />
                {knownWaWeeks.length > 0 && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Semaines connues en base (aperçu)&nbsp;:{' '}
                    {knownWaWeeks.slice(0, 4).map((k) => k.value).join(', ')}
                    {knownWaWeeks.length > 4 ? '…' : ''}
                  </Text>
                )}
              </>
            )}
          </Paper>

          <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md" shadow="xs">
            <SectionHeader icon={IconCoin}>Tarifs</SectionHeader>
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
              <NumberInput
                label="Bonus par patient soigné (virement)"
                description="Ajouté au virement, par patient, hors objets offerts."
                min={0.01}
                max={MAX_CAISSE_PRICE_USD}
                step={0.05}
                decimalScale={2}
                suffix=" $"
                size="md"
                value={patientCarePriceUsd}
                onChange={(v) => {
                  if (v === '' || v === undefined) return;
                  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) setPatientCarePriceUsd(n);
                }}
              />
              <NumberInput
                label="Prix unitaire chose offerte (hors virement)"
                description="Lait de pavot / infusion ginseng, pour le total argent (pas le salaire)."
                min={0.01}
                max={MAX_CAISSE_PRICE_USD}
                step={0.05}
                decimalScale={2}
                suffix=" $"
                size="md"
                value={offeredItemPriceUsd}
                onChange={(v) => {
                  if (v === '' || v === undefined) return;
                  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) setOfferedItemPriceUsd(n);
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
              {importWeeklyActivity ? (
                <>
                  Colle la balise{' '}
                  <Text span ff="monospace" size="xs">{`<table>…</table>`}</Text> si tu en as une, ou
                  laisse vide si toute l’équipe est couverte par l’activité hebdomadaire importée.
                </>
              ) : (
                <>
                  Colle la balise{' '}
                  <Text span ff="monospace" size="xs">{`<table>…</table>`}</Text> telle qu’exportée.
                  L’import weekly activity est désactivé : le HTML est requis.
                </>
              )}
            </Alert>
            <Textarea
              label={importWeeklyActivity ? 'Source HTML (optionnel)' : 'Source HTML (requis)'}
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
                <Button
                  variant="default"
                  component={Link}
                  href={routes.employee.payroll}
                  disabled={submitting}
                >
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

