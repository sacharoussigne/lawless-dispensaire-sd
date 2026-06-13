import type { CompanyWithRelations } from '@/types/companies';

export function sortCompanies(companies: CompanyWithRelations[]): CompanyWithRelations[] {
  return [...companies].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
  );
}
