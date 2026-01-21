import type { Company, Location } from '@prisma/client';

export interface CompanyWithRelations extends Company {
  location: { id: string; name: string };
  companyGroups: { id: string }[];
}

export type { Location };

