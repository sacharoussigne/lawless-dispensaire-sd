'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { updateAppSettings, type DispensarySettingsAdminDTO } from '@/app/_actions/appSettings';
import { slugifyDispensaryName } from '@/lib/dispensary/slug';
import { tenantRoutes } from '@/types/routes';

export default function AppSettingsPageClient({
  dispensarySlug,
  initial,
}: {
  dispensarySlug: string;
  initial: DispensarySettingsAdminDTO;
}) {
  const router = useRouter();
  const [dispensaryName, setDispensaryName] = useState(initial.dispensaryName);
  const [slug, setSlug] = useState(initial.slug);
  const [featureStockEnabled, setFeatureStockEnabled] = useState(
    initial.featureStockEnabled,
  );
  const [featureBankEnabled, setFeatureBankEnabled] = useState(
    initial.featureBankEnabled,
  );
  const [featurePrivatePracticeEnabled, setFeaturePrivatePracticeEnabled] =
    useState(initial.featurePrivatePracticeEnabled);
  const [featureOrdersEnabled, setFeatureOrdersEnabled] = useState(
    initial.featureOrdersEnabled,
  );
  const [featureSearchEnabled, setFeatureSearchEnabled] = useState(
    initial.featureSearchEnabled,
  );
  const [featureMailsEnabled, setFeatureMailsEnabled] = useState(
    initial.featureMailsEnabled,
  );
  const [featurePayrollEnabled, setFeaturePayrollEnabled] = useState(
    initial.featurePayrollEnabled,
  );
  const [featureWeeklyDispensaryActivityEnabled, setFeatureWeeklyDispensaryActivityEnabled] =
    useState(initial.featureWeeklyDispensaryActivityEnabled);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await updateAppSettings(dispensarySlug, {
      dispensaryName,
      slug: slug.trim().toLowerCase(),
      featureStockEnabled,
      featureBankEnabled,
      featurePrivatePracticeEnabled,
      featureOrdersEnabled,
      featureSearchEnabled,
      featureMailsEnabled,
      featurePayrollEnabled,
      featureWeeklyDispensaryActivityEnabled,
    });
    setSubmitting(false);

    if (res.status !== 200 || !('data' in res)) {
      notifications.show({
        title: 'Erreur',
        message: 'error' in res ? res.error : 'Échec de la mise à jour',
        color: 'red',
      });
      return;
    }

    notifications.show({
      title: 'Enregistré',
      message: 'Les paramètres ont été mis à jour.',
      color: 'green',
    });

    if (res.data.slug !== dispensarySlug) {
      router.push(tenantRoutes(res.data.slug).admin.settings);
      router.refresh();
      return;
    }

    router.refresh();
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Paramètres application</Title>

      <Card withBorder shadow="sm" radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Identité</Title>
          <TextInput
            label="Nom du dispensaire"
            description="Affiché dans le sélecteur du header et le titre du site."
            value={dispensaryName}
            onChange={(e) => setDispensaryName(e.currentTarget.value)}
          />
          <Group align="flex-end" wrap="nowrap">
            <TextInput
              label="Slug (URL)"
              description={`Chemin d'accès : /d/${slug || '…'}`}
              className="flex-1"
              value={slug}
              onChange={(e) => setSlug(e.currentTarget.value)}
            />
            <Button
              variant="default"
              onClick={() => setSlug(slugifyDispensaryName(dispensaryName))}
            >
              Générer depuis le nom
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder shadow="sm" radius="md" padding="lg">
        <Stack gap="lg">
          <Title order={4}>Fonctionnalités employés</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Stock"
                checked={featureStockEnabled}
                onChange={(e) =>
                  setFeatureStockEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Banque"
                checked={featureBankEnabled}
                onChange={(e) => setFeatureBankEnabled(e.currentTarget.checked)}
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Cabinet privé"
                checked={featurePrivatePracticeEnabled}
                onChange={(e) =>
                  setFeaturePrivatePracticeEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Commandes"
                checked={featureOrdersEnabled}
                onChange={(e) =>
                  setFeatureOrdersEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Recherche"
                checked={featureSearchEnabled}
                onChange={(e) =>
                  setFeatureSearchEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Courriers"
                checked={featureMailsEnabled}
                onChange={(e) =>
                  setFeatureMailsEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Rapports salaires"
                checked={featurePayrollEnabled}
                onChange={(e) =>
                  setFeaturePayrollEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Switch
                label="Activité hebdomadaire (dispensaire)"
                checked={featureWeeklyDispensaryActivityEnabled}
                onChange={(e) =>
                  setFeatureWeeklyDispensaryActivityEnabled(e.currentTarget.checked)
                }
              />
            </Paper>
          </SimpleGrid>
        </Stack>
      </Card>

      <Button loading={submitting} onClick={handleSubmit}>
        Enregistrer
      </Button>
    </Stack>
  );
}
