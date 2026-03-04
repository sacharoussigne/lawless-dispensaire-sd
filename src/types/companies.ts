import type { Company } from '@prisma/client';

export interface CompanyWithRelations extends Company {
  companyGroups: { id: string }[];
}

