'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
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

export type WeeklyActivityListItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  displayName: string;
  resolvedDisplayName: string;
  discordUserId: string;
  userId: string | null;
  chestCount: number;
  sheriffPatientsCount: number;
  patientsCount: number;
  infusionsCount: number;
  poppyMilkCount: number;
  createdAt: string;
  updatedAt: string;
};

type HistoryEntry = {
  id: string;
  action: string;
  source: string;
  actorUserName: string | null;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<WeeklyActivityListItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyTitle, setHistoryTitle] = useState('');

  const defaultWeekMonday = useMemo(() => getBankWeekBounds(new Date()).start, []);

  const [cWeekDateValue, setCWeekDateValue] = useState<Date | null>(defaultWeekMonday);
  const [cTargetUserId, setCTargetUserId] = useState<string | null>(null);
  const [cDisplayName, setCDisplayName] = useState('');
  const [cChest, setCChest] = useState(0);
  const [cSheriff, setCSheriff] = useState(0);
  const [cPatients, setCPatients] = useState(0);
  const [cInfusions, setCInfusions] = useState(0);
  const [cPoppy, setCPoppy] = useState(0);
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);

  const [eWeekDateValue, setEWeekDateValue] = useState<Date | null>(null);
  const [eChest, setEChest] = useState(0);
  const [eSheriff, setESheriff] = useState(0);
  const [ePatients, setEPatients] = useState(0);
  const [eInfusions, setEInfusions] = useState(0);
  const [ePoppy, setEPoppy] = useState(0);
  const [eDisplayName, setEDisplayName] = useState('');

  const createWeekBounds = useMemo(
    () => getBankWeekBounds(cWeekDateValue ?? defaultWeekMonday),
    [cWeekDateValue, defaultWeekMonday],
  );

  const editWeekBounds = useMemo(
    () => (eWeekDateValue ? getBankWeekBounds(eWeekDateValue) : null),
    [eWeekDateValue],
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
        chestCount: cChest,
        sheriffPatientsCount: cSheriff,
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
      window.location.reload();
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
    setEChest(row.chestCount);
    setESheriff(row.sheriffPatientsCount);
    setEPatients(row.patientsCount);
    setEInfusions(row.infusionsCount);
    setEPoppy(row.poppyMilkCount);
    setEWeekDateValue(new Date(row.periodStart));
    setEDisplayName(row.displayName);
  };

  const submitEdit = async () => {
    if (!editRow || !eWeekDateValue) return;
    const { start, end } = getBankWeekBounds(eWeekDateValue);
    try {
      const base = {
        id: editRow.id,
        periodStart: start,
        periodEnd: end,
        chestCount: eChest,
        sheriffPatientsCount: eSheriff,
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
      window.location.reload();
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
          window.location.reload();
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
          <Text c="dimmed" mt="xs">
            Compteurs par semaine Europe/Paris (lundi → dimanche). Les entrées créées via le bot ou
            sans compte intranet restent rattachées à un ID Discord.
          </Text>
        </div>
        {canEdit && (
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              setCWeekDateValue(defaultWeekMonday);
              setCTargetUserId(null);
              setCDisplayName('');
              setCChest(0);
              setCSheriff(0);
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
          records={initialRows}
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
            { accessor: 'chestCount', title: 'Caisses' },
            { accessor: 'sheriffPatientsCount', title: 'Soins shérifs' },
            { accessor: 'patientsCount', title: 'Patients' },
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

          <div>
            <Text fw={600} size="sm" mb="xs">
              Compteurs
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput label="Caisses" value={cChest} onChange={(v) => setCChest(Number(v) || 0)} min={0} />
              <NumberInput
                label="Soins shérifs"
                value={cSheriff}
                onChange={(v) => setCSheriff(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Patients soignés"
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
        {editRow && eWeekDateValue && editWeekBounds && (
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

            <div>
              <Text fw={600} size="sm" mb="xs">
                Période
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Semaine Europe/Paris (même règle qu’à la création).
              </Text>
              <WeekNavigation
                weekStart={editWeekBounds.start}
                weekEnd={editWeekBounds.end}
                weekDateValue={eWeekDateValue}
                onWeekChange={(d) => {
                  if (d) setEWeekDateValue(d);
                }}
                onPreviousWeek={() => setEWeekDateValue((prev) => (prev ? addParisWeeks(prev, -1) : prev))}
                onNextWeek={() => setEWeekDateValue((prev) => (prev ? addParisWeeks(prev, 1) : prev))}
              />
            </div>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput label="Caisses" value={eChest} onChange={(v) => setEChest(Number(v) || 0)} min={0} />
              <NumberInput
                label="Soins shérifs"
                value={eSheriff}
                onChange={(v) => setESheriff(Number(v) || 0)}
                min={0}
              />
              <NumberInput
                label="Patients soignés"
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
                  {h.actorUserName ?? h.actorDiscordUserId ?? '—'}
                </Text>
              </Paper>
            ))
          )}
        </Stack>
      </Modal>
    </Container>
  );
}
