import type { CompanyGroupWithRelations } from '@/types/companyGroups';

export function sortCompanyGroups(
  companyGroups: CompanyGroupWithRelations[],
): CompanyGroupWithRelations[] {
  return [...companyGroups].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
  );
}
