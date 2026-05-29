export const dynamic = 'force-dynamic';

import { listDispensariesForPlatform } from '@/app/_actions/dispensaries';
import { DispensariesPlatformClient } from './DispensariesPlatformClient';

export default async function PlatformDispensariesPage() {
  const result = await listDispensariesForPlatform();
  return (
    <DispensariesPlatformClient
      initialDispensaries={result.status === 200 ? result.data ?? [] : []}
      error={result.status !== 200 ? result.error : undefined}
    />
  );
}
