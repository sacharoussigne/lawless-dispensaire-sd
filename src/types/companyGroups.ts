import type { CompanyGroup, Company } from '@prisma/client';

export interface CompanyGroupWithRelations extends CompanyGroup {
  items: { id: string }[];
  companies: {
    id: string;
    companyId?: string;
    company: Company;
  }[];
}

export interface CompanyWithRelations extends Company {
  companyGroups: { id: string }[];
}

