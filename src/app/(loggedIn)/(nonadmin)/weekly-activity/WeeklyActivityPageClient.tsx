'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { DataTable } from 'mantine-datatable';
import {
  IconHistory,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  createDispensaryWeeklyActivity,
  deleteDispensaryWeeklyActivity,
  getDispensaryWeeklyActivityHistory,
  listDispensaryWeeklyActivities,
  listDispensaryWeeklyActivityTargets,
  updateDispensaryWeeklyActivity,
} from '@/app/_actions/dispensaryWeeklyActivity';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { handleAction } from '@/lib/action';
import { addParisWeeks, getBankWeekBounds } from '@/lib/bankWeek';
import { formatDispensaryHistoryAction } from '@/lib/dispensaryWeeklyActivity/historyActionLabel';
import {
  formatParisPeriodEndLabel,
  formatParisPeriodStartLabel,
} from '@/lib/dispensaryWeeklyActivity/parisPeriodLabels';
import type { SerializedDispensaryWeeklyActivityRow } from '@/lib/dispensaryWeeklyActivity/apiRow';
import {
  emptyWeekdayFlags,
  WEEKDAY_KEYS,
  type WeekdayFlags,
  type WeekdayKey,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

export type WeeklyActivityListItem = SerializedDispensaryWeeklyActivityRow;

const DAY_SHORT: Record<WeekdayKey, string> = {
  lundi: 'Lun',
  mardi: 'Mar',
  mercredi: 'Mer',
  jeudi: 'Jeu',
  vendredi: 'Ven',
  samedi: 'Sam',
  dimanche: 'Dim',
};

function DayFlagFields({
  title,
  flags,
  onToggle,
}: {
  title: string;
  flags: WeekdayFlags;
  onToggle: (key: WeekdayKey, value: boolean) => void;
}) {
  return (
    <div>
      <Text fw={600} size="sm" mb="xs">
        {title}
      </Text>
      <Group gap="md" wrap="wrap">
        {WEEKDAY_KEYS.map((k) => (
          <Checkbox
            key={k}
            label={DAY_SHORT[k]}
            checked={flags[k]}
            onChange={(e) => onToggle(k, e.currentTarget.checked)}
          />
        ))}
      </Group>
    </div>
  );
}

type HistoryEntry = {
  id: string;
  action: string;
  source: string;
  actorUserName: string | null;
  actorResolvedName: string | null;
  actorDiscordUserId: string | null;
  previousValues: unknown;
  nextValues: unknown;
  createdAt: string;
};

type TargetUser = { id: string; name: string };

export default function WeeklyActivityPageClient({
  initialRows,
  canEditAll,
  canEdit,
  sessionUserId,
  viewerDiscordId,
  defaultDisplayName,
}: {
  initialRows: WeeklyActivityListItem[];
  canEditAll: boolean;
  canEdit: boolean;
  sessionUserId: string;
  viewerDiscordId: string | null;
  defaultDisplayName: string;
}) {
  const [rows, setRows] = useState<WeeklyActivityListItem[]>(initialRows);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<WeeklyActivityListItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyTitle, setHistoryTitle] = useState('');

  const defaultWeekMonday = useMemo(() => getBankWeekBounds(new Date()).start, []);

  const [cWeekDateValue, setCWeekDateValue] = useState<Date | null>(defaultWeekMonday);
  const [cTargetUserId, setCTargetUserId] = useState<string | null>(null);
  const [cDisplayName, setCDisplayName] = useState('');
  const [cChestFlags, setCChestFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [cPresenceFlags, setCPresenceFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [cSheriff, setCSheriff] = useState(0);
  const [cPalefrenier, setCPalefrenier] = useState(0);
  const [cPatients, setCPatients] = useState(0);
  const [cInfusions, setCInfusions] = useState(0);
  const [cPoppy, setCPoppy] = useState(0);
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);

  const [eChestFlags, setEChestFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [ePresenceFlags, setEPresenceFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [eSheriff, setESheriff] = useState(0);
  const [ePalefrenier, setEPalefrenier] = useState(0);
  const [ePatients, setEPatients] = useState(0);
  const [eInfusions, setEInfusions] = useState(0);
  const [ePoppy, setEPoppy] = useState(0);
  const [eDisplayName, setEDisplayName] = useState('');

  const createWeekBounds = useMemo(
    () => getBankWeekBounds(cWeekDateValue ?? defaultWeekMonday),
    [cWeekDateValue, defaultWeekMonday],
  );

  useEffect(() => {
    if (!createOpen || !canEditAll) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listDispensaryWeeklyActivityTargets();
        const data = handleAction(res);
        if (!cancelled && data?.users) {
          setTargetUsers(data.users as TargetUser[]);
        }
      } catch (e) {
        if (!cancelled) {
          notifications.show({
            title: 'Erreur',
            message: e instanceof Error ? e.message : 'Impossible de charger les utilisateurs',
            color: 'red',
          });
          setTargetUsers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, canEditAll]);

  const refreshRows = async () => {
    const res = await listDispensaryWeeklyActivities();
    const data = handleAction<WeeklyActivityListItem[]>(res);
    if (Array.isArray(data)) {
      setRows(data);
    } else {
      setRows([]);
    }
  };

  const canEditRow = (row: WeeklyActivityListItem) => {
    if (!canEdit) return false;
    if (canEditAll) return true;
    if (row.userId && row.userId === sessionUserId) return true;
    if (viewerDiscordId && row.discordUserId === viewerDiscordId) return true;
    return false;
  };

  const openHistory = async (row: WeeklyActivityListItem) => {
    try {
      const res = await getDispensaryWeeklyActivityHistory({ id: row.id });
      handleAction(res);
      if (res.status === 200 && 'data' in res) {
        setHistoryEntries(res.data);
      }
      setHistoryTitle(row.resolvedDisplayName);
      setHistoryOpen(true);
    } catch (e) {
      notifications.show({
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Erreur',
        color: 'red',
      });
    }
  };

  const submitCreate = async () => {
    if (!cWeekDateValue) {
      notifications.show({ title: 'Période', message: 'Choisissez une semaine', color: 'yellow' });
      return;
    }
    if (canEditAll && !cTargetUserId) {
      notifications.show({ title: 'Médecin', message: 'Sélectionnez un utilisateur', color: 'yellow' });
      return;
    }
    const { start, end } = getBankWeekBounds(cWeekDateValue);
    try {
      const payload = {
        periodStart: start,
        periodEnd: end,
        chestDays: cChestFlags,
        presenceDays: cPresenceFlags,
        sherifCount: cSheriff,
        palefrenierCount: cPalefrenier,
        patientsCount: cPatients,
        infusionsCount: cInfusions,
        poppyMilkCount: cPoppy,
        ...(canEditAll && cTargetUserId
          ? {
              targetUserId: cTargetUserId,
              ...(cDisplayName.trim() ? { displayName: cDisplayName.trim() } : {}),
            }
          : {}),
      };
      const res = await createDispensaryWeeklyActivity(payload);
      handleAction(res);
      notifications.show({ title: 'Créé', message: '', color: 'green' });
      setCreateOpen(false);
      await refreshRows();
    } catch (e) {
      notifications.show({
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Erreur',
        color: 'red',
      });
    }
  };

  const startEdit = (row: WeeklyActivityListItem) => {
    setEditRow(row);
    setEChestFlags({ ...row.chestDays });
    setEPresenceFlags({ ...row.presenceDays });
    setESheriff(row.sherifCount);
    setEPalefrenier(row.palefrenierCount);
    setEPatients(row.patientsCount);
    setEInfusions(row.infusionsCount);
    setEPoppy(row.poppyMilkCount);
    setEDisplayName(row.displayName);
  };

  const submitEdit = async () => {
    if (!editRow) return;
    try {
      const base = {
        id: editRow.id,
        chestDays: eChestFlags,
        presenceDays: ePresenceFlags,
        sherifCount: eSheriff,
        palefrenierCount: ePalefrenier,
        patientsCount: ePatients,
        infusionsCount: eInfusions,
        poppyMilkCount: ePoppy,
      };
      const res = await updateDispensaryWeeklyActivity(
        canEditAll
          ? { ...base, displayName: eDisplayName.trim() || editRow.displayName }
          : base,
      );
      handleAction(res);
      notifications.show({ title: 'Enregistré', message: '', color: 'green' });
      setEditRow(null);
      await refreshRows();
    } catch (e) {
      notifications.show({
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Erreur',
        color: 'red',
      });
    }
  };

  const confirmDelete = (row: WeeklyActivityListItem) => {
    modals.openConfirmModal({
      title: 'Supprimer cette entrée ?',
      children: <Text size="sm">L’historique est conservé.</Text>,
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const res = await deleteDispensaryWeeklyActivity({ id: row.id });
          handleAction(res);
          notifications.show({ title: 'Supprimé', message: '', color: 'green' });
          await refreshRows();
        } catch (e) {
          notifications.show({
            title: 'Erreur',
            message: e instanceof Error ? e.message : 'Erreur',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <div>
          <Title order={1}>Activité hebdomadaire</Title>
        </div>
        {canEdit && (
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              setCWeekDateValue(defaultWeekMonday);
              setCTargetUserId(null);
              setCDisplayName('');
              setCChestFlags(emptyWeekdayFlags());
              setCPresenceFlags(emptyWeekdayFlags());
              setCSheriff(0);
              setCPalefrenier(0);
              setCPatients(0);
              setCInfusions(0);
              setCPoppy(0);
              setCreateOpen(true);
            }}
          >
            Nouvelle entrée
          </Button>
        )}
      </Group>

      <Paper shadow="sm" p="md" withBorder radius="md">
        <DataTable
          records={rows}
          minHeight={200}
          columns={[
            {
              accessor: 'resolvedDisplayName',
              title: 'Médecin',
              render: (r) => r.resolvedDisplayName,
            },
            {
              accessor: 'period',
              title: 'Période',
              render: (r) => (
                <Text size="sm">
                  {formatParisPeriodStartLabel(new Date(r.periodStart))} —{' '}
                  {formatParisPeriodEndLabel(new Date(r.periodEnd))}
                </Text>
              ),
            },
            {
              accessor: 'chestDaysSummary',
              title: 'Caisses',
              render: (r) => (
                <Tooltip label={`${r.chestTotal} jour(s) — L→D : ${r.chestDaysSummary}`}>
                  <Text size="sm" ff="monospace">
                    {r.chestDaysSummary}
                  </Text>
                </Tooltip>
              ),
            },
            {
              accessor: 'presenceDaysSummary',
              title: 'Présences',
              render: (r) => (
                <Tooltip label={`${r.presenceTotal} jour(s) — L→D : ${r.presenceDaysSummary}`}>
                  <Text size="sm" ff="monospace">
                    {r.presenceDaysSummary}
                  </Text>
                </Tooltip>
              ),
            },
            { accessor: 'patientsCount', title: 'Patients' },
            { accessor: 'sherifCount', title: 'Shérifs' },
            { accessor: 'palefrenierCount', title: 'Palefreniers' },
            { accessor: 'infusionsCount', title: 'Infusions' },
            { accessor: 'poppyMilkCount', title: 'Lait de pavot' },
            {
              accessor: 'actions',
              title: '',
              render: (r) => (
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  <Tooltip label="Historique">
                    <ActionIcon variant="subtle" onClick={() => openHistory(r)} aria-label="Historique">
                      <IconHistory size={18} />
                    </ActionIcon>
                  </Tooltip>
                  {canEditRow(r) && (
                    <>
                      <Tooltip label="Modifier">
                        <ActionIcon variant="subtle" onClick={() => startEdit(r)} aria-label="Modifier">
                          <IconPencil size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Supprimer">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => confirmDelete(r)}
                          aria-label="Supprimer"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </>
                  )}
                </Group>
              ),
            },
          ]}
        />
      </Paper>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle activité"
        size="lg"
        radius="md"
      >
        <Stack gap="lg">
          {canEditAll && (
            <>
              <div>
                <Text fw={600} size="sm" mb="xs">
                  Médecin
                </Text>
                <Select
                  label="Utilisateur intranet"
                  description="Comptes avec Discord lié uniquement."
                  placeholder="Choisir un utilisateur"
                  data={targetUsers.map((u) => ({ value: u.id, label: u.name }))}
                  value={cTargetUserId}
                  onChange={(id) => {
                    setCTargetUserId(id);
                    const u = targetUsers.find((t) => t.id === id);
                    if (u) setCDisplayName(u.name);
                  }}
                  searchable
                  nothingFoundMessage="Aucun résultat"
                  required
                />
                <TextInput
                  label="Nom affiché"
                  description="Par défaut le nom du compte ; vous pouvez le personnaliser (RP, etc.)."
                  value={cDisplayName}
                  onChange={(e) => setCDisplayName(e.currentTarget.value)}
                  mt="sm"
                />
              </div>
              <Divider />
            </>
          )}
          {!canEditAll && (
            <>
              <Text size="sm" c="dimmed">
                Entrée pour <Text span fw={500}>{defaultDisplayName}</Text> (compte Discord lié requis).
              </Text>
              <Divider />
            </>
          )}

          <div>
            <Text fw={600} size="sm" mb="xs">
              Période
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Semaine Europe/Paris : choisissez n’importe quel jour de la semaine cible.
            </Text>
            {cWeekDateValue && (
              <WeekNavigation
                weekStart={createWeekBounds.start}
                weekEnd={createWeekBounds.end}
                weekDateValue={cWeekDateValue}
                onWeekChange={(d) => {
                  if (d) setCWeekDateValue(d);
                }}
                onPreviousWeek={() => setCWeekDateValue((prev) => (prev ? addParisWeeks(prev, -1) : prev))}
                onNextWeek={() => setCWeekDateValue((prev) => (prev ? addParisWeeks(prev, 1) : prev))}
              />
            )}
          </div>

          <Divider />

          <DayFlagFields
            title="Caisses (par jour de semaine)"
            flags={cChestFlags}
            onToggle={(key, value) => setCChestFlags((p) => ({ ...p, [key]: value }))}
          />
          <DayFlagFields
            title="Présences (par jour)"
            flags={cPresenceFlags}
            onToggle={(key, value) => setCPresenceFlags((p) => ({ ...p, [key]: value }))}
          />

          <Divider />

          <div>
            <Text fw={600} size="sm" mb="xs">
              Compteurs
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Shérifs"
                value={cSheriff}
                onChange={(v) => setCSheriff(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Palefreniers"
                value={cPalefrenier}
                onChange={(v) => setCPalefrenier(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Patients"
                value={cPatients}
                onChange={(v) => setCPatients(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Infusions vendues"
                value={cInfusions}
                onChange={(v) => setCInfusions(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Lait de pavot"
                value={cPoppy}
                onChange={(v) => setCPoppy(Number(v) || 0)}
                min={0}
              />
            </SimpleGrid>
          </div>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => submitCreate()}>Créer</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editRow !== null}
        onClose={() => setEditRow(null)}
        title="Modifier l’activité"
        size="lg"
        radius="md"
      >
        {editRow && (
          <Stack gap="lg">
            <Text size="sm" fw={500}>
              {editRow.resolvedDisplayName}
            </Text>
            {canEditAll && (
              <TextInput
                label="Nom affiché"
                value={eDisplayName}
                onChange={(e) => setEDisplayName(e.currentTarget.value)}
              />
            )}

            <DayFlagFields
              title="Caisses (par jour de semaine)"
              flags={eChestFlags}
              onToggle={(key, value) => setEChestFlags((p) => ({ ...p, [key]: value }))}
            />
            <DayFlagFields
              title="Présences (par jour)"
              flags={ePresenceFlags}
              onToggle={(key, value) => setEPresenceFlags((p) => ({ ...p, [key]: value }))}
            />

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Shérifs"
                value={eSheriff}
                onChange={(v) => setESheriff(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Palefreniers"
                value={ePalefrenier}
                onChange={(v) => setEPalefrenier(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Patients"
                value={ePatients}
                onChange={(v) => setEPatients(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Infusions vendues"
                value={eInfusions}
                onChange={(v) => setEInfusions(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Lait de pavot"
                value={ePoppy}
                onChange={(v) => setEPoppy(Number(v) || 0)}
                min={0}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setEditRow(null)}>
                Annuler
              </Button>
              <Button onClick={() => submitEdit()}>Enregistrer</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Historique — ${historyTitle}`}
        size="lg"
        radius="md"
      >
        <Stack gap="sm">
          {historyEntries.length === 0 ? (
            <Text c="dimmed" size="sm">
              Aucun historique.
            </Text>
          ) : (
            historyEntries.map((h) => (
              <Paper key={h.id} withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">
                  {format(new Date(h.createdAt), 'Pp', { locale: fr })} —{' '}
                  {formatDispensaryHistoryAction(h.action)} —{' '}
                  {h.source === 'INTRANET' ? 'Intranet' : 'Bot Discord'}
                </Text>
                <Text size="sm">
                  {h.actorResolvedName
                    ? `${h.actorResolvedName}${h.actorDiscordUserId ? ` (${h.actorDiscordUserId})` : ''}`
                    : (h.actorDiscordUserId ?? '—')}
                </Text>
              </Paper>
            ))
          )}
        </Stack>
      </Modal>
    </Container>
  );
}
