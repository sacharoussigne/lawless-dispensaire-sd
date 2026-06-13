'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { Alert, Button, Container, Group, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import Link from 'next/link';
import { format, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { IconArrowLeft, IconCheck, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import { payrollReportResultSchema } from '@/lib/payroll/schema';
import {
  useDeletePayrollReportMutation,
  useUpdatePayrollReportMutation,
  type PayrollReportDetail as PayrollReportDetailType,
} from '../hooks/usePayrollQueries';
import { PayrollEmployeeSection } from './PayrollEmployeeSection';
import { PayrollTotalsPaper } from './PayrollTotalsPaper';
import { PayrollVirementsSection } from './PayrollVirementsSection';
import {
  PAYROLL_RP_DISPLAY_YEAR_OFFSET,
  payrollRpDisplayDate,
  wireTransferDescription,
} from './payrollDetailUtils';
import { usePayrollReportDraft } from './usePayrollReportDraft';

export default function PayrollReportDetail({
  reportId,
  canDelete,
  canEdit,
  report,
}: {
  reportId: string;
  canDelete: boolean;
  canEdit: boolean;
  report: PayrollReportDetailType;
}) {
  const routes = useTenantRoutes();
  const updateMutation = useUpdatePayrollReportMutation(reportId);
  const deleteMutation = useDeletePayrollReportMutation({ redirectToList: true });
  const parsed = payrollReportResultSchema.safeParse(report.resultJson);

  const {
    draft,
    isEditing,
    setIsEditing,
    isDirty,
    pricingSectionOpen,
    setPricingSectionOpen,
    updateSchedule,
    patchEmployeeStats,
    patchEmployeePayrollSettings,
    patchReportCaissePrice,
    patchReportCaisseSalePrice,
    patchReportPatientCarePrice,
    patchReportOfferedItemPrice,
    handleCancelEdit,
    markSaved,
  } = usePayrollReportDraft(report);

  const handleSave = () => {
    if (!draft || updateMutation.isPending) return;
    updateMutation.mutate(draft, { onSuccess: () => markSaved() });
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: <Text size="sm">Cette action est irréversible.</Text>,
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'danger' },
      onConfirm: () => deleteMutation.mutate(reportId),
    });
  };

  const weekStartDate = new Date(report.weekStart);
  const weekEndDate = new Date(report.weekEnd);
  const wireDescription = wireTransferDescription(weekStartDate, weekEndDate);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" align="flex-start" wrap="wrap">
        <div>
          <Button
            component={Link}
            href={routes.employee.payroll}
            variant="subtle"
            color="slate"
            size="sm"
            leftSection={<IconArrowLeft size={16} stroke={1.5} />}
            mb="xs"
          >
            Rapports salaires
          </Button>
          <Title order={1}>
            {report.reportType} - Semaine du{' '}
            {format(payrollRpDisplayDate(weekStartDate), 'dd MMMM yyyy', { locale: fr })} au{' '}
            {format(payrollRpDisplayDate(weekEndDate), 'dd MMMM yyyy', { locale: fr })}
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Par {report.createdBy.name} — {format(new Date(report.createdAt), 'Pp', { locale: fr })}
          </Text>
          {draft?.weekly_activity_import && (
            <Text size="xs" c="dimmed" mt={6}>
              Import de l'activité hebdomadaire :{' '}
              {format(
                subYears(new Date(draft.weekly_activity_import.weekStart), PAYROLL_RP_DISPLAY_YEAR_OFFSET),
                'dd/MM/yyyy',
                { locale: fr },
              )}{' '}
              –{' '}
              {format(
                subYears(new Date(draft.weekly_activity_import.weekEnd), PAYROLL_RP_DISPLAY_YEAR_OFFSET),
                'dd/MM/yyyy',
                { locale: fr },
              )}
            </Text>
          )}
        </div>
        <Group gap="sm" justify="flex-end" wrap="wrap">
          {canEdit && !isEditing && !isDirty && (
            <Button leftSection={<IconEdit size={18} />} onClick={() => setIsEditing(true)} variant="light">
              Modifier
            </Button>
          )}
          {canEdit && (isDirty || isEditing) && (
            <Button leftSection={<IconX size={18} />} onClick={handleCancelEdit} variant="subtle" color="slate">
              Annuler
            </Button>
          )}
          {canEdit && (isDirty || isEditing) && (
            <Button
              leftSection={<IconCheck size={18} />}
              onClick={handleSave}
              disabled={!isDirty}
              loading={updateMutation.isPending}
              variant="filled"
              color="sage"
            >
              Sauvegarder
            </Button>
          )}
          {canDelete && (
            <Button
              color="danger"
              variant="light"
              leftSection={<IconTrash size={18} />}
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Supprimer
            </Button>
          )}
        </Group>
      </Group>

      {report.errorMessage && (
        <Alert color="danger" title="Échec d&apos;analyse" mb="lg">
          {report.errorMessage}
        </Alert>
      )}

      {!report.errorMessage && parsed.success && draft && (
        <>
          <PayrollTotalsPaper
            draft={draft}
            canEdit={canEdit}
            isEditing={isEditing}
            pricingSectionOpen={pricingSectionOpen}
            onPricingSectionToggle={() => setPricingSectionOpen((o) => !o)}
            onCaisseSalePriceChange={patchReportCaisseSalePrice}
            onCaissePriceChange={patchReportCaissePrice}
            onPatientCarePriceChange={patchReportPatientCarePrice}
            onOfferedItemPriceChange={patchReportOfferedItemPrice}
          />
          <PayrollVirementsSection draft={draft} wireDescription={wireDescription} />
          <PayrollEmployeeSection
            draft={draft}
            canEdit={canEdit}
            isEditing={isEditing}
            onUpdateSchedule={updateSchedule}
            onPatchEmployeeStats={patchEmployeeStats}
            onPatchEmployeePayrollSettings={patchEmployeePayrollSettings}
          />
        </>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson != null && (
        <Alert color="amber" title="Données non reconnues">
          Le JSON enregistré ne correspond pas au format attendu.
        </Alert>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson == null && (
        <Alert color="slate" title="Données indisponibles">
          Ce rapport n&apos;a pas encore de résultat enregistré.
        </Alert>
      )}
    </Container>
  );
}
