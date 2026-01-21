import { getOrders } from '@/app/_actions/orders';
import OrdersPageClient from './OrdersPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { OrderWithRelations } from '@/types/orders';

async function OrdersContent() {
  const result = await getOrders();

  const orders: OrderWithRelations[] =
    result.status === 200 && 'data' in result && result.data ? result.data : [];

  return <OrdersPageClient initialOrders={orders} />;
}

export default function OrdersPage() {
  return (
    <SuspenseLoader>
      <OrdersContent />
    </SuspenseLoader>
  );
}
