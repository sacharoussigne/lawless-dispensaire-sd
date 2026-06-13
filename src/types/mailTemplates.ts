import type { MailTemplate } from '@prisma/client';

export type { MailTemplate };

export type MailTemplateListItem = Pick<
  MailTemplate,
  | 'id'
  | 'name'
  | 'description'
  | 'defaultMailName'
  | 'createdAt'
  | 'updatedAt'
  | 'dispensaryId'
  | 'userId'
>;
