'use client';

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
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
  updateDispensaryWeeklyActivity,
} from '@/app/_actions/dispensaryWeeklyActivity';
import { handleAction } from '@/lib/action';
import { formatDispensaryHistoryAction } from '@/lib/dispensaryWeeklyActivity/historyActionLabel';
import {
  formatUtcPeriodEndLabel,
  formatUtcPeriodStartLabel,
  getUtcIsoWeekRange,
  toUtcYmd,
  utcMidnightFromYmd,
} from '@/lib/dispensaryWeeklyActivity/utcIsoWeek';
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

  const defaultPeriod = useMemo(() => {
    const { periodStart, periodEnd } = getUtcIsoWeekRange(new Date());
    return {
      startStr: toUtcYmd(periodStart),
      endStr: toUtcYmd(periodEnd),
    };
  }, []);

  const [cPeriodStart, setCPeriodStart] = useState<string | null>(defaultPeriod.startStr);
  const [cPeriodEnd, setCPeriodEnd] = useState<string | null>(defaultPeriod.endStr);
  const [cDiscordId, setCDiscordId] = useState('');
  const [cDisplayName, setCDisplayName] = useState('');
  const [cChest, setCChest] = useState(0);
  const [cSheriff, setCSheriff] = useState(0);
  const [cPatients, setCPatients] = useState(0);
  const [cInfusions, setCInfusions] = useState(0);
  const [cPoppy, setCPoppy] = useState(0);

  const [eChest, setEChest] = useState(0);
  const [eSheriff, setESheriff] = useState(0);
  const [ePatients, setEPatients] = useState(0);
  const [eInfusions, setEInfusions] = useState(0);
  const [ePoppy, setEPoppy] = useState(0);
  const [ePeriodStart, setEPeriodStart] = useState<string | null>(null);
  const [ePeriodEnd, setEPeriodEnd] = useState<string | null>(null);
  const [eDisplayName, setEDisplayName] = useState('');

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
    if (!cPeriodStart || !cPeriodEnd) {
      notifications.show({ title: 'Dates', message: 'Période requise', color: 'yellow' });
      return;
    }
    try {
      const payload = {
        periodStart: utcMidnightFromYmd(cPeriodStart),
        periodEnd: utcMidnightFromYmd(cPeriodEnd),
        chestCount: cChest,
        sheriffPatientsCount: cSheriff,
        patientsCount: cPatients,
        infusionsCount: cInfusions,
        poppyMilkCount: cPoppy,
        ...(canEditAll
          ? { discordUserId: cDiscordId.trim(), displayName: cDisplayName.trim() }
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
    setEPeriodStart(toUtcYmd(new Date(row.periodStart)));
    setEPeriodEnd(toUtcYmd(new Date(row.periodEnd)));
    setEDisplayName(row.displayName);
  };

  const submitEdit = async () => {
    if (!editRow || !ePeriodStart || !ePeriodEnd) return;
    try {
      const base = {
        id: editRow.id,
        periodStart: utcMidnightFromYmd(ePeriodStart),
        periodEnd: utcMidnightFromYmd(ePeriodEnd),
        chestCount: eChest,
        sheriffPatientsCount: eSheriff,
        patientsCount: ePatients,
        infusionsCount: eInfusions,
        poppyMilkCount: ePoppy,
      };
      const res = await updateDispensaryWeeklyActivity(
        canEditAll ? { ...base, displayName: eDisplayName } : base,
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
              Compteurs par période (caisses, soins, infusions, etc.). Les médecins sans compte
              intranet sont identifiés par Discord.
            </Text>
          </div>
          {canEdit && (
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setCPeriodStart(defaultPeriod.startStr);
                setCPeriodEnd(defaultPeriod.endStr);
                setCDiscordId('');
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

        <Paper shadow="sm" p="md" withBorder>
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
                    {formatUtcPeriodStartLabel(new Date(r.periodStart))} —{' '}
                    {formatUtcPeriodEndLabel(new Date(r.periodEnd))}
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

        <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle activité" size="lg">
          <Stack gap="md">
            {canEditAll && (
              <>
                <TextInput
                  label="ID Discord du médecin"
                  description="Identifiant numérique Discord (snowflake)."
                  value={cDiscordId}
                  onChange={(e) => setCDiscordId(e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Nom affiché"
                  value={cDisplayName}
                  onChange={(e) => setCDisplayName(e.currentTarget.value)}
                  required
                />
              </>
            )}
            {!canEditAll && (
              <Text size="sm" c="dimmed">
                Entrée pour {defaultDisplayName} (compte Discord lié requis).
              </Text>
            )}
            <TextInput
              type="date"
              label="Début de période"
              value={cPeriodStart ?? ''}
              onChange={(e) => setCPeriodStart(e.currentTarget.value || null)}
            />
            <TextInput
              type="date"
              label="Fin de période"
              value={cPeriodEnd ?? ''}
              onChange={(e) => setCPeriodEnd(e.currentTarget.value || null)}
            />
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
            <Group justify="flex-end">
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
        >
          {editRow && (
            <Stack gap="md">
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
              <TextInput
                type="date"
                label="Début de période"
                value={ePeriodStart ?? ''}
                onChange={(e) => setEPeriodStart(e.currentTarget.value || null)}
              />
              <TextInput
                type="date"
                label="Fin de période"
                value={ePeriodEnd ?? ''}
                onChange={(e) => setEPeriodEnd(e.currentTarget.value || null)}
              />
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
              <Group justify="flex-end">
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
