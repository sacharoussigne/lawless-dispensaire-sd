import { getOrders } from '@/app/_actions/orders';
import OrdersPageClient from './OrdersPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function OrdersContent({ dispensarySlug }: { dispensarySlug: string }) {
  const result = await getOrders(dispensarySlug);
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const orders = getDataOrThrow(result, 'Erreur lors du chargement des commandes');

  return <OrdersPageClient initialOrders={orders} />;
}

export default async function OrdersPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <OrdersContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
