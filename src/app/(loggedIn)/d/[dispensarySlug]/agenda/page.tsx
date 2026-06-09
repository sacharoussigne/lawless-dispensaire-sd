import dayjs from '@/lib/dayjs';
import {
  checkAgendaModuleAccess,
  listAccessibleAgendas,
} from '@/app/_actions/agenda/agendas';
import { listAgendaEvents } from '@/app/_actions/agenda/events';
import { listAgendaTodoLists } from '@/app/_actions/agenda/todoLists';
import { AgendaPageClient } from './AgendaPageClient';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;

  const accessResult = await checkAgendaModuleAccess(dispensarySlug);
  if (accessResult.status !== 200) {
    redirect(tenantRoutes(dispensarySlug).employee.index);
  }

  const { hasAccess, isAdmin } =
    accessResult.status === 200 && 'data' in accessResult
      ? accessResult.data
      : { hasAccess: false, isAdmin: false };

  if (!hasAccess) {
    redirect(tenantRoutes(dispensarySlug).employee.index);
  }

  const agendasResult = await listAccessibleAgendas(dispensarySlug);
  const agendas =
    agendasResult.status === 200 && 'data' in agendasResult
      ? agendasResult.data ?? []
      : [];
  const firstAgendaId = agendas[0]?.id;

  const rangeStart = dayjs().startOf('month').subtract(1, 'week').toDate();
  const rangeEnd = dayjs().endOf('month').add(1, 'week').toDate();

  const [eventsResult, todosResult] = await Promise.all([
    firstAgendaId
      ? listAgendaEvents(dispensarySlug, {
          agendaId: firstAgendaId,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        })
      : Promise.resolve({ status: 200 as const, data: [] }),
    firstAgendaId
      ? listAgendaTodoLists(dispensarySlug, firstAgendaId)
      : Promise.resolve({ status: 200 as const, data: [] }),
  ]);

  return (
    <AgendaPageClient
      dispensarySlug={dispensarySlug}
      agendas={agendas}
      initialEvents={
        eventsResult.status === 200 && 'data' in eventsResult
          ? eventsResult.data ?? []
          : []
      }
      initialTodoLists={
        todosResult.status === 200 && 'data' in todosResult
          ? todosResult.data ?? []
          : []
      }
      isAdmin={isAdmin}
    />
  );
}
