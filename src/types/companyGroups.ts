import type { Company, CompanyGroup } from '@prisma/client';

export interface CompanyGroupCompanyRelation {
  id: string;
  companyId: string;
  company: Pick<Company, 'id' | 'name'>;
}

export interface CompanyGroupWithRelations extends CompanyGroup {
  _count: { items: number };
  companies: CompanyGroupCompanyRelation[];
}

export interface CompanyGroupForOrders {
  id: string;
  name: string;
  companies: {
    company: Pick<Company, 'id' | 'name'>;
  }[];
}
