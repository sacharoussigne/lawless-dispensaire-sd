import { getOrdersPage } from '@/app/_actions/orders';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import OrdersPageClient from './OrdersPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { defaultOrdersPageFilters } from './hooks/useOrdersQueries';

async function OrdersContent({ dispensarySlug }: { dispensarySlug: string }) {
  const [ordersResult, assignmentsResult] = await Promise.all([
    getOrdersPage(dispensarySlug, {
      page: defaultOrdersPageFilters.page,
      pageSize: defaultOrdersPageFilters.pageSize,
    }),
    getOrderLetterTemplateAssignments(dispensarySlug),
  ]);

  const initialOrdersPage = getDataOrThrow(
    ordersResult,
    'Erreur lors du chargement des commandes',
  );
  const initialAssignments = getDataOrThrow(
    assignmentsResult,
    'Erreur lors du chargement des assignations de modèles de courriers',
  );

  return (
    <OrdersPageClient
      initialOrdersPage={initialOrdersPage}
      initialAssignments={initialAssignments}
    />
  );
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <OrdersContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
