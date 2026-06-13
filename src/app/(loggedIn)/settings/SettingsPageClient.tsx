'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  ActionIcon,
  Button,
  Card,
  Container,
  ColorInput,
  Divider,
  FileInput,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { handleApiZodError } from '@/lib/services/zod';
import { handleAction } from '@/lib/action';
import { changeMyPassword, updateMyProfile } from '@/app/_actions/account';
import { updateMyStockUiPreferences } from '@/app/_actions/stockUiPreferences';
import { useRouter } from 'next/navigation';
import type { StockUiPreferences } from '@/types/stockUiPreferences';
import { STOCK_UI_DEFAULTS } from '@/types/stockUiPreferences';
import { IconX } from '@tabler/icons-react';

type SettingsImageMode = 'url' | 'upload';

const MAX_IMAGE_BYTES = 1_000_000;
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Impossible de lire le fichier'));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsPageClient(props: {
  initialUser: { name: string; image: string | null };
  canChangePassword: boolean;
  initialStockUiPreferences: StockUiPreferences;
}) {
  const router = useRouter();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [stockUiSaving, setStockUiSaving] = useState(false);
  const [imageMode, setImageMode] = useState<SettingsImageMode>('url');

  const profileForm = useForm({
    initialValues: {
      name: props.initialUser.name,
      imageUrl: typeof props.initialUser.image === 'string' ? props.initialUser.image : '',
      imageFile: null as File | null,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Le nom est requis' : null),
      imageUrl: (value, values) => {
        if (imageMode !== 'url') return null;
        if (!value) return null;
        try {
          new URL(value);
          return null;
        } catch {
          return 'URL invalide';
        }
      },
      imageFile: (file) => {
        if (imageMode !== 'upload') return null;
        if (!file) return null;
        if (file.size > MAX_IMAGE_BYTES) return 'Image trop lourde (1MB max)';
        if (!ACCEPTED_MIME_TYPES.includes(file.type as any)) return 'Type non supporté (PNG, JPG, WebP)';
        return null;
      },
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
    validate: {
      currentPassword: (value) => (value.length < 1 ? 'Le mot de passe actuel est requis' : null),
      newPassword: (value) => (value.length < 8 ? 'Le mot de passe doit contenir au moins 8 caractères' : null),
      confirmNewPassword: (value, values) =>
        value !== values.newPassword ? 'Les mots de passe ne correspondent pas' : null,
    },
  });

  const stockUiForm = useForm({
    initialValues: {
      lowStockCraftableBg: props.initialStockUiPreferences.lowStockCraftableBg,
      lowStockNormalBg: props.initialStockUiPreferences.lowStockNormalBg,
      okStockBg: props.initialStockUiPreferences.okStockBg ?? '',
      unknownStockBg: props.initialStockUiPreferences.unknownStockBg ?? '',
      doneTodayBadgeBg: props.initialStockUiPreferences.doneTodayBadgeBg ?? '',
    },
    validate: {
      lowStockCraftableBg: (value) => (!/^#[0-9a-fA-F]{6}$/.test(value) ? 'Couleur invalide (#RRGGBB)' : null),
      lowStockNormalBg: (value) => (!/^#[0-9a-fA-F]{6}$/.test(value) ? 'Couleur invalide (#RRGGBB)' : null),
      okStockBg: (value) => (value && !/^#[0-9a-fA-F]{6}$/.test(value) ? 'Couleur invalide (#RRGGBB)' : null),
      unknownStockBg: (value) => (value && !/^#[0-9a-fA-F]{6}$/.test(value) ? 'Couleur invalide (#RRGGBB)' : null),
      doneTodayBadgeBg: (value) => (value && !/^#[0-9a-fA-F]{6}$/.test(value) ? 'Couleur invalide (#RRGGBB)' : null),
    },
  });

  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageMode !== 'upload' || !profileForm.values.imageFile) {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
      setUploadPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(profileForm.values.imageFile);
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [imageMode, profileForm.values.imageFile]);

  const avatarPreviewSrc = useMemo(() => {
    if (imageMode === 'upload' && profileForm.values.imageFile) {
      return uploadPreviewUrl;
    }
    if (imageMode === 'url' && profileForm.values.imageUrl) {
      return profileForm.values.imageUrl;
    }
    return props.initialUser.image ?? null;
  }, [imageMode, profileForm.values.imageUrl, props.initialUser.image, uploadPreviewUrl, profileForm.values.imageFile]);

  const handleSaveProfile = async () => {
    try {
      const validated = profileForm.validate();
      if (validated.hasErrors) return;

      setProfileSaving(true);

      let image: string | null | undefined = undefined;
      if (imageMode === 'upload') {
        if (profileForm.values.imageFile) {
          image = await fileToDataUrl(profileForm.values.imageFile);
        }
      } else {
        image = profileForm.values.imageUrl ? profileForm.values.imageUrl : null;
      }

      const result = await updateMyProfile({
        name: profileForm.values.name.trim(),
        image,
      });
      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Profil mis à jour',
        color: 'green',
      });

      router.refresh();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, profileForm);
        return;
      }
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour du profil',
        color: 'red',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      const validated = passwordForm.validate();
      if (validated.hasErrors) return;

      setPasswordSaving(true);

      const result = await changeMyPassword({
        currentPassword: passwordForm.values.currentPassword,
        newPassword: passwordForm.values.newPassword,
      });
      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Mot de passe mis à jour',
        color: 'green',
      });

      passwordForm.reset();
      router.refresh();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, passwordForm);
        return;
      }
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour du mot de passe',
        color: 'red',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveStockUi = async () => {
    try {
      const validated = stockUiForm.validate();
      if (validated.hasErrors) return;

      setStockUiSaving(true);

      const result = await updateMyStockUiPreferences({
        lowStockCraftableBg: stockUiForm.values.lowStockCraftableBg,
        lowStockNormalBg: stockUiForm.values.lowStockNormalBg,
        okStockBg: stockUiForm.values.okStockBg ? stockUiForm.values.okStockBg : null,
        unknownStockBg: stockUiForm.values.unknownStockBg ? stockUiForm.values.unknownStockBg : null,
        doneTodayBadgeBg: stockUiForm.values.doneTodayBadgeBg ? stockUiForm.values.doneTodayBadgeBg : null,
      });

      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Préférences de stock mises à jour',
        color: 'green',
      });

      router.refresh();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        // Server-side Zod errors should not happen often here, but we keep parity with other forms.
        // We map them to the form for a better UX.
        handleApiZodError(error.error, stockUiForm as any);
        return;
      }
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour des préférences',
        color: 'red',
      });
    } finally {
      setStockUiSaving(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Paramètres du compte</Title>
          <Text c="dimmed" mt="xs">
            Modifiez votre profil et votre mot de passe.
          </Text>
        </div>
      </Group>

      <Stack gap="lg">
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Title order={3}>Profil</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Username et avatar.
              </Text>
            </div>
            <Avatar src={avatarPreviewSrc} radius="xl" size={56} />
          </Group>

          <Stack gap="md">
            <TextInput
              label="Username"
              required
              {...profileForm.getInputProps('name')}
            />

            <SegmentedControl
              value={imageMode}
              onChange={(value) => setImageMode(value as SettingsImageMode)}
              data={[
                { label: 'URL', value: 'url' },
                { label: 'Upload', value: 'upload' },
              ]}
              fullWidth
            />

            {imageMode === 'url' ? (
              <TextInput
                label="Avatar (URL)"
                placeholder="https://..."
                {...profileForm.getInputProps('imageUrl')}
              />
            ) : (
              <FileInput
                label="Avatar (upload)"
                placeholder="PNG, JPG, WebP — 1MB max"
                accept={ACCEPTED_MIME_TYPES.join(',')}
                value={profileForm.values.imageFile}
                onChange={(file) => profileForm.setFieldValue('imageFile', file)}
                error={profileForm.errors.imageFile}
                clearable
              />
            )}

            <Group justify="flex-end">
              <Button onClick={handleSaveProfile} loading={profileSaving}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </Card>

        {props.canChangePassword && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={3} mb="md">
              Sécurité
            </Title>
            <Divider mb="md" />

            <Stack gap="md">
              <PasswordInput
                label="Mot de passe actuel"
                required
                {...passwordForm.getInputProps('currentPassword')}
              />
              <PasswordInput
                label="Nouveau mot de passe"
                required
                {...passwordForm.getInputProps('newPassword')}
              />
              <PasswordInput
                label="Confirmer le nouveau mot de passe"
                required
                {...passwordForm.getInputProps('confirmNewPassword')}
              />
              <Group justify="flex-end">
                <Button onClick={handleSavePassword} loading={passwordSaving}>
                  Mettre à jour
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Title order={3} mb="md">
            Affichage du stock
          </Title>
          <Divider mb="md" />

          <Stack gap="md">
            <ColorInput
              label="Stock bas (craftable ou sans groupe)"
              format="hex"
              required
              rightSection={
                stockUiForm.values.lowStockCraftableBg !== STOCK_UI_DEFAULTS.lowStockCraftableBg ? (
                  <ActionIcon
                    variant="subtle"
                    color="slate"
                    aria-label="Réinitialiser"
                    onClick={() =>
                      stockUiForm.setFieldValue('lowStockCraftableBg', STOCK_UI_DEFAULTS.lowStockCraftableBg)
                    }
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              rightSectionPointerEvents="all"
              {...stockUiForm.getInputProps('lowStockCraftableBg')}
            />

            <ColorInput
              label="Stock bas (non-craftable avec groupe)"
              format="hex"
              required
              rightSection={
                stockUiForm.values.lowStockNormalBg !== STOCK_UI_DEFAULTS.lowStockNormalBg ? (
                  <ActionIcon
                    variant="subtle"
                    color="slate"
                    aria-label="Réinitialiser"
                    onClick={() => stockUiForm.setFieldValue('lowStockNormalBg', STOCK_UI_DEFAULTS.lowStockNormalBg)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              rightSectionPointerEvents="all"
              {...stockUiForm.getInputProps('lowStockNormalBg')}
            />

            <ColorInput
              label="Stock OK (optionnel)"
              description="Laisse vide pour ne pas colorer les lignes OK."
              format="hex"
              rightSection={
                stockUiForm.values.okStockBg ? (
                  <ActionIcon
                    variant="subtle"
                    color="slate"
                    aria-label="Effacer"
                    onClick={() => stockUiForm.setFieldValue('okStockBg', '')}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              rightSectionPointerEvents="all"
              {...stockUiForm.getInputProps('okStockBg')}
            />

            <ColorInput
              label="Stock inconnu (optionnel)"
              description="Laisse vide pour ne pas colorer les lignes avec '?'."
              format="hex"
              rightSection={
                stockUiForm.values.unknownStockBg ? (
                  <ActionIcon
                    variant="subtle"
                    color="slate"
                    aria-label="Effacer"
                    onClick={() => stockUiForm.setFieldValue('unknownStockBg', '')}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              rightSectionPointerEvents="all"
              {...stockUiForm.getInputProps('unknownStockBg')}
            />

            <ColorInput
              label={'Badge "Fait" (optionnel)'}
              description="Laisse vide pour revenir au vert par défaut."
              format="hex"
              rightSection={
                stockUiForm.values.doneTodayBadgeBg ? (
                  <ActionIcon
                    variant="subtle"
                    color="slate"
                    aria-label="Effacer"
                    onClick={() => stockUiForm.setFieldValue('doneTodayBadgeBg', '')}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              rightSectionPointerEvents="all"
              {...stockUiForm.getInputProps('doneTodayBadgeBg')}
            />

            <Group justify="flex-end">
              <Button onClick={handleSaveStockUi} loading={stockUiSaving}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

