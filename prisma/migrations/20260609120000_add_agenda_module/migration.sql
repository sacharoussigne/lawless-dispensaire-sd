-- CreateEnum
CREATE TYPE "AgendaAccessLevel" AS ENUM ('OWNER', 'WRITE', 'READ');

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN "featureAgendaEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "agenda" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_member" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "AgendaAccessLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_event" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_event_participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_event_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_todo_list" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_todo_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_todo_category" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_todo_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_todo_task" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_todo_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_event_todo_task" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_event_todo_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_dispensaryId_idx" ON "agenda"("dispensaryId");

-- CreateIndex
CREATE INDEX "agenda_member_userId_idx" ON "agenda_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_member_agendaId_userId_key" ON "agenda_member"("agendaId", "userId");

-- CreateIndex
CREATE INDEX "agenda_event_agendaId_startAt_idx" ON "agenda_event"("agendaId", "startAt");

-- CreateIndex
CREATE INDEX "agenda_event_participant_userId_idx" ON "agenda_event_participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_event_participant_eventId_userId_key" ON "agenda_event_participant"("eventId", "userId");

-- CreateIndex
CREATE INDEX "agenda_todo_list_agendaId_idx" ON "agenda_todo_list"("agendaId");

-- CreateIndex
CREATE INDEX "agenda_todo_category_listId_idx" ON "agenda_todo_category"("listId");

-- CreateIndex
CREATE INDEX "agenda_todo_task_categoryId_idx" ON "agenda_todo_task"("categoryId");

-- CreateIndex
CREATE INDEX "agenda_event_todo_task_eventId_idx" ON "agenda_event_todo_task"("eventId");

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_member" ADD CONSTRAINT "agenda_member_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_member" ADD CONSTRAINT "agenda_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event_participant" ADD CONSTRAINT "agenda_event_participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "agenda_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event_participant" ADD CONSTRAINT "agenda_event_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_todo_list" ADD CONSTRAINT "agenda_todo_list_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_todo_category" ADD CONSTRAINT "agenda_todo_category_listId_fkey" FOREIGN KEY ("listId") REFERENCES "agenda_todo_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_todo_task" ADD CONSTRAINT "agenda_todo_task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "agenda_todo_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event_todo_task" ADD CONSTRAINT "agenda_event_todo_task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "agenda_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
