-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "guildOnly" BOOLEAN NOT NULL DEFAULT true,
    "dmPermission" BOOLEAN NOT NULL DEFAULT false,
    "responseType" TEXT NOT NULL DEFAULT 'TEXT',
    "responseTemplate" JSONB NOT NULL,
    "ephemeral" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CommandOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commandId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "min" INTEGER,
    "max" INTEGER,
    "choices" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommandOption_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Command_name_key" ON "Command"("name");

-- CreateIndex
CREATE INDEX "Command_enabled_idx" ON "Command"("enabled");

-- CreateIndex
CREATE INDEX "Command_updatedAt_idx" ON "Command"("updatedAt");

-- CreateIndex
CREATE INDEX "CommandOption_commandId_position_idx" ON "CommandOption"("commandId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CommandOption_commandId_name_key" ON "CommandOption"("commandId", "name");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
