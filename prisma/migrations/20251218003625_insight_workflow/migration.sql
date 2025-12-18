-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "score" REAL,
    "meta" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Insight" ("content", "createdAt", "id", "meta", "score", "title", "type", "userId") SELECT "content", "createdAt", "id", "meta", "score", "title", "type", "userId" FROM "Insight";
DROP TABLE "Insight";
ALTER TABLE "new_Insight" RENAME TO "Insight";
CREATE INDEX "Insight_userId_createdAt_idx" ON "Insight"("userId", "createdAt");
CREATE INDEX "Insight_type_createdAt_idx" ON "Insight"("type", "createdAt");
CREATE INDEX "Insight_userId_isPinned_idx" ON "Insight"("userId", "isPinned");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
