-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('text', 'image', 'video', 'audio', 'link');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'password', 'private');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('comment', 'reaction');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "BackupFormat" AS ENUM ('json', 'markdown', 'pdf');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('queued', 'running', 'success', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "settings" JSONB,
    "backupConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "htmlRendered" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'text',
    "visibility" "Visibility" NOT NULL DEFAULT 'public',
    "password" TEXT,
    "location" JSONB,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "metadata" JSONB,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "visitorId" TEXT,
    "type" "InteractionType" NOT NULL,
    "content" TEXT,
    "ipHash" TEXT,
    "reactionKey" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVersion" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "format" "BackupFormat" NOT NULL,
    "storageLocation" TEXT,
    "fileSize" INTEGER,
    "status" "BackupStatus" NOT NULL DEFAULT 'queued',
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_deletedAt_idx" ON "Post"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_reactionKey_key" ON "Interaction"("reactionKey");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVersion" ADD CONSTRAINT "PostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
