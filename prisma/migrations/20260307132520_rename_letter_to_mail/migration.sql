-- Rename table letter_template to mail_template
ALTER TABLE "letter_template" RENAME TO "mail_template";

-- Rename table order_letter_template_assignment to order_mail_template_assignment
ALTER TABLE "order_letter_template_assignment" RENAME TO "order_mail_template_assignment";

-- Rename column letterTemplateId to mailTemplateId in order_mail_template_assignment
ALTER TABLE "order_mail_template_assignment" RENAME COLUMN "letterTemplateId" TO "mailTemplateId";
