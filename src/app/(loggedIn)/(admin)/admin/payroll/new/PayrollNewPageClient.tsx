'use client';

import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DateInput, DatesProvider } from '@mantine/dates';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { routes } from '@/types/routes';
import { PayrollSortableFileRow } from './PayrollSortableFileRow';

const MAX_FILES = 12;

type PayrollFileItem = { id: string; file: File };

export default function PayrollNewPageClient() {
  const router = useRouter();
  const [weekDate, setWeekDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [fileItems, setFileItems] = useState<PayrollFileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDrop = (dropped: File[]) => {
    const room = MAX_FILES - fileItems.length;
    if (room <= 0) {
      notifications.show({
        title: 'Limite atteinte',
        message: `Maximum ${MAX_FILES} fichiers.`,
        color: 'orange',
      });
      return;
    }
    const toAdd = dropped.slice(0, room);
    if (dropped.length > room) {
      notifications.show({
        title: 'Limite atteinte',
        message: `Seuls les ${room} premiers fichiers ont été ajoutés (max ${MAX_FILES}).`,
        color: 'orange',
      });
    }
    setFileItems((prev) => [
      ...prev,
      ...toAdd.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFileItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async () => {
    const weekStart = weekDate;
    if (!weekStart) {
      notifications.show({ title: 'Date requise', message: 'Choisissez une date dans la semaine.', color: 'red' });
      return;
    }
    if (fileItems.length === 0) {
      notifications.show({ title: 'Images requises', message: 'Ajoutez au moins une capture.', color: 'red' });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('weekStart', weekStart);
      for (const { file } of fileItems) {
        fd.append('files', file);
      }

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
      <Container size="sm">
        <Title order={2} mb="md">
          Nouveau rapport
        </Title>
        <Text c="dimmed" size="sm" mb="lg">
          Choisissez un jour de la semaine concernée (le lundi sera déduit automatiquement) et ajoutez les captures
          d&apos;écran du tableau en jeu. Vous pouvez réordonner les images : l&apos;ordre est conservé pour
          l&apos;analyse et l&apos;envoi vers S3.
        </Text>

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

          <div>
            <Text size="sm" fw={500} mb={6}>
              Captures d&apos;écran
            </Text>
            <Dropzone
              onDrop={handleDrop}
              onReject={() =>
                notifications.show({ title: 'Fichier refusé', message: 'Format ou taille non accepté.', color: 'red' })
              }
              maxSize={12 * 1024 * 1024}
              accept={IMAGE_MIME_TYPE}
              multiple
              disabled={fileItems.length >= MAX_FILES}
            >
              <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={48} stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={48} stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size={48} stroke={1.5} />
                </Dropzone.Idle>
                <div>
                  <Text size="lg" inline>
                    Glissez des images ou cliquez pour sélectionner
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    PNG, JPEG, WebP — max 12 Mo par fichier — max {MAX_FILES} fichiers
                  </Text>
                </div>
              </Group>
            </Dropzone>

            {fileItems.length > 0 && (
              <Stack gap="xs" mt="md">
                <Text size="sm" c="dimmed">
                  Ordre d&apos;envoi (glisser la poignée pour réordonner) :
                </Text>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={fileItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack gap="xs">
                      {fileItems.map((item, index) => (
                        <PayrollSortableFileRow
                          key={item.id}
                          id={item.id}
                          file={item.file}
                          index={index}
                          onRemove={() =>
                            setFileItems((prev) => prev.filter((x) => x.id !== item.id))
                          }
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              </Stack>
            )}
          </div>

          <Group justify="flex-end">
            <Button variant="default" component={Link} href={routes.admin.payroll}>
              Annuler
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Envoyer et analyser
            </Button>
          </Group>
        </Stack>
      </Container>
    </DatesProvider>
  );
}
