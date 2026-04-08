'use client';

import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Prisma } from '@prisma/client';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import { PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { IconTrash } from '@tabler/icons-react';
import { routes } from '@/types/routes';

const DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

export default function PayrollReportDetail({
  canDelete,
  report,
}: {
  canDelete: boolean;
  report: {
    id: string;
    weekStart: string;
    weekEnd: string;
    resultJson: Prisma.JsonValue;
    errorMessage: string | null;
    createdAt: string;
    createdBy: { name: string; email: string };
  };
}) {
  const router = useRouter();
  const parsed = payrollReportResultSchema.safeParse(report.resultJson);

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: (
        <Text size="sm">Cette action est irréversible.</Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/payroll-reports/${report.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Échec de la suppression');
          }
          notifications.show({ title: 'Rapport supprimé', message: '', color: 'green' });
          router.push(routes.admin.payroll);
          router.refresh();
        } catch (e: unknown) {
          notifications.show({
            title: 'Erreur',
            message: e instanceof Error ? e.message : 'Erreur inconnue',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="lg" align="flex-start">
        <div>
          <Anchor component={Link} href={routes.admin.payroll} size="sm" mb={4}>
            ← Rapports salaires
          </Anchor>
          <Title order={2}>
            Semaine du {format(new Date(report.weekStart), 'd MMMM yyyy', { locale: fr })} au{' '}
            {format(new Date(report.weekEnd), 'd MMMM yyyy', { locale: fr })}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Par {report.createdBy.name} — {format(new Date(report.createdAt), 'Pp', { locale: fr })}
          </Text>
        </div>
        <Group gap="sm">
          {canDelete && (
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={18} />}
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          )}
        </Group>
      </Group>

      {report.errorMessage && (
        <Alert color="red" title="Échec d&apos;analyse" mb="lg">
          {report.errorMessage}
        </Alert>
      )}

      {!report.errorMessage && parsed.success && (
        <>
          <Paper shadow="sm" p="md" withBorder mb="lg">
            <Title order={4} mb="sm">
              Totaux
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <div>
                <Text size="sm" c="dimmed">
                  Employés
                </Text>
                <Text fw={600}>{parsed.data.global_stats.total_employees}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Caisses (total)
                </Text>
                <Text fw={600}>{parsed.data.global_stats.total_caisses}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Shérifs soignés (total)
                </Text>
                <Text fw={600}>{parsed.data.global_stats.total_sherifs}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Palefreniers (total)
                </Text>
                <Text fw={600}>{parsed.data.global_stats.total_palefreniers}</Text>
              </div>
            </SimpleGrid>
          </Paper>

          <Stack gap="xl">
            {parsed.data.employees.map((emp) => {
              const caisses = emp.stats.nombre_caisses ?? 0;
              const pay = caisses * PAYROLL_CAISSE_USD;
              return (
                <Paper key={`${emp.name}-${emp.id ?? 'x'}`} shadow="sm" p="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={600}>{emp.name}</Text>
                      <Text size="sm" c="dimmed">
                        {emp.role}
                        {emp.id != null ? ` — ID ${emp.id}` : ''}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="sm" c="dimmed">
                        Estimation caisses × {PAYROLL_CAISSE_USD} $
                      </Text>
                      <Text fw={700}>{pay.toFixed(2)} $</Text>
                    </div>
                  </Group>

                  <Text size="sm" fw={500} mb={6}>
                    Planning
                  </Text>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Jour</Table.Th>
                        <Table.Th>Caisse</Table.Th>
                        <Table.Th>Présence soins</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {DAYS.map((day) => (
                        <Table.Tr key={day}>
                          <Table.Td style={{ textTransform: 'capitalize' }}>{day}</Table.Td>
                          <Table.Td>{emp.schedule[day]?.caisse ?? '—'}</Table.Td>
                          <Table.Td>{emp.schedule[day]?.presence ?? '—'}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="md">
                    <div>
                      <Text size="xs" c="dimmed">
                        Shérifs soignés
                      </Text>
                      <Text>{emp.stats.sherifs ?? '—'}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        Palefreniers soignés
                      </Text>
                      <Text>{emp.stats.palefreniers ?? '—'}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        Caisses
                      </Text>
                      <Text>{emp.stats.nombre_caisses ?? '—'}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        Présences
                      </Text>
                      <Text>{emp.stats.nombre_presences ?? '—'}</Text>
                    </div>
                  </SimpleGrid>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson != null && (
        <Alert color="orange" title="Données non reconnues">
          Le JSON enregistré ne correspond pas au format attendu.
        </Alert>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson == null && (
        <Alert color="gray" title="Données indisponibles">
          Ce rapport n&apos;a pas encore de résultat enregistré.
        </Alert>
      )}

    </Container>
  );
}
