import type { Company, CompanyGroup } from '@prisma/client';

export type CompanySelect = Pick<Company, 'id' | 'name'>;

export interface CompanyGroupMembership {
  companyGroupId: string;
  companyGroup: Pick<CompanyGroup, 'id' | 'name'>;
}

export interface CompanyWithRelations extends Company {
  companyGroups: CompanyGroupMembership[];
  _count: {
    companyGroups: number;
    orders: number;
  };
}
