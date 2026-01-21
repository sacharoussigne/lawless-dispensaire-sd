import type { CompanyGroup, Company } from '@prisma/client';

export interface CompanyGroupWithRelations extends CompanyGroup {
  items: { id: string }[];
  companies: {
    id: string;
    companyId?: string;
    company: Company & {
      location: {
        id: string;
        name: string;
      };
    };
  }[];
}

export interface CompanyWithRelations extends Company {
  location: { id: string; name: string };
  companyGroups: { id: string }[];
}

