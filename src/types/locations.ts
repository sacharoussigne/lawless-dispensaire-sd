import type { Location } from '@prisma/client';

export interface LocationWithCompanies extends Location {
  companies: { id: string; name: string }[];
}

