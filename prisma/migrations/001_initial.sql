-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ForeverUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverSiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverSiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ForeverGuide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL DEFAULT '/images/community.webp',
    "author" TEXT NOT NULL DEFAULT 'Forever Community Team',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverGuild" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "ruleset" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "playstyle" TEXT NOT NULL,
    "raidDays" TEXT[],
    "raidTime" TEXT NOT NULL,
    "lootSystem" TEXT NOT NULL,
    "recruitingClasses" TEXT[],
    "description" TEXT NOT NULL,
    "contactDiscord" TEXT NOT NULL,
    "inviteUrl" TEXT,
    "websiteUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "submittedIpHash" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverGuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactDiscord" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverReport" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "reporterDiscord" TEXT NOT NULL,
    "reporterCharacter" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "guild" TEXT,
    "faction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "incidentAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "lootRules" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "severity" INTEGER NOT NULL DEFAULT 1,
    "assignedTo" TEXT,
    "decisionReason" TEXT,
    "internalNotes" TEXT,
    "firstReviewerId" TEXT,
    "submittedIpHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedAt" TIMESTAMP(3),
    "evidencePurgeAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverEvidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "appealId" TEXT,
    "storageKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForeverEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverAppeal" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "appellantDiscord" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "requestedOutcome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "decisionReason" TEXT,
    "reviewedBy" TEXT,
    "submittedIpHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverSafetyAlert" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "guild" TEXT,
    "category" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "appealStatus" TEXT NOT NULL DEFAULT 'none',
    "lastReviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverSafetyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverAddonRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'alpha',
    "changelog" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverAddonRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sessionId" TEXT,
    "ipHash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referrerHost" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "country" TEXT,
    "device" TEXT NOT NULL,
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForeverAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForeverAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeverRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ForeverWebhookJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForeverWebhookJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForeverUser_email_key" ON "ForeverUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverGuide_slug_key" ON "ForeverGuide"("slug");

-- CreateIndex
CREATE INDEX "ForeverGuide_published_publishedAt_idx" ON "ForeverGuide"("published", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverGuild_slug_key" ON "ForeverGuild"("slug");

-- CreateIndex
CREATE INDEX "ForeverGuild_status_region_faction_ruleset_idx" ON "ForeverGuild"("status", "region", "faction", "ruleset");

-- CreateIndex
CREATE INDEX "ForeverGroup_status_expiresAt_idx" ON "ForeverGroup"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverReport_publicId_key" ON "ForeverReport"("publicId");

-- CreateIndex
CREATE INDEX "ForeverReport_status_createdAt_idx" ON "ForeverReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ForeverReport_character_realm_region_idx" ON "ForeverReport"("character", "realm", "region");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverEvidence_storageKey_key" ON "ForeverEvidence"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverAppeal_publicId_key" ON "ForeverAppeal"("publicId");

-- CreateIndex
CREATE INDEX "ForeverAppeal_status_createdAt_idx" ON "ForeverAppeal"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverSafetyAlert_reportId_key" ON "ForeverSafetyAlert"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverSafetyAlert_publicId_key" ON "ForeverSafetyAlert"("publicId");

-- CreateIndex
CREATE INDEX "ForeverSafetyAlert_active_expiresAt_idx" ON "ForeverSafetyAlert"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForeverAddonRelease_version_key" ON "ForeverAddonRelease"("version");

-- CreateIndex
CREATE INDEX "ForeverAnalyticsEvent_createdAt_event_idx" ON "ForeverAnalyticsEvent"("createdAt", "event");

-- CreateIndex
CREATE INDEX "ForeverAnalyticsEvent_source_createdAt_idx" ON "ForeverAnalyticsEvent"("source", "createdAt");

-- CreateIndex
CREATE INDEX "ForeverAnalyticsEvent_sessionId_createdAt_idx" ON "ForeverAnalyticsEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ForeverAuditLog_entityType_entityId_idx" ON "ForeverAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ForeverEvidence" ADD CONSTRAINT "ForeverEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ForeverReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeverEvidence" ADD CONSTRAINT "ForeverEvidence_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "ForeverAppeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeverAppeal" ADD CONSTRAINT "ForeverAppeal_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ForeverReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeverSafetyAlert" ADD CONSTRAINT "ForeverSafetyAlert_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ForeverReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
