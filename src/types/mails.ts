import type { Mail, MailTemplate } from '@prisma/client';

export type MailListItem = {
  id: string;
  name: string;
  receiver: string;
  createdAt: Date;
  contentPreview: string;
};

export type MailsPageFilters = {
  page: number;
  pageSize: number;
  nameSearch: string;
  receiverSearch: string;
};

export type MailsPageResult = {
  items: MailListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type MailTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  defaultMailName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MailTemplatesPageFilters = {
  page: number;
  pageSize: number;
  nameSearch: string;
};

export type MailTemplatesPageResult = {
  items: MailTemplateListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type MailTemplateOption = {
  id: string;
  name: string;
};

export type { Mail, MailTemplate };
