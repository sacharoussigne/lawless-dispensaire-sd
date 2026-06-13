import type { MailsPageFilters, MailTemplatesPageFilters } from '@/types/mails';

export type { MailsPageFilters, MailTemplatesPageFilters };

export const mailsKeys = {
  all: (slug: string) => ['mails', slug] as const,
  page: (slug: string, filters: MailsPageFilters) =>
    [...mailsKeys.all(slug), 'page', filters] as const,
  detail: (slug: string, mailId: string) =>
    [...mailsKeys.all(slug), 'detail', mailId] as const,
};

export const mailTemplatesKeys = {
  all: (slug: string) => ['mailTemplates', slug] as const,
  page: (slug: string, filters: MailTemplatesPageFilters) =>
    [...mailTemplatesKeys.all(slug), 'page', filters] as const,
  detail: (slug: string, templateId: string) =>
    [...mailTemplatesKeys.all(slug), 'detail', templateId] as const,
  options: (slug: string) =>
    [...mailTemplatesKeys.all(slug), 'options'] as const,
};
