-- CreateTable
CREATE TABLE "ContractDeployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "rpcUrl" TEXT,
    "chainId" INTEGER,
    "contractName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "deployTxHash" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractDeployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractDeployment_userId_createdAt_idx" ON "ContractDeployment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractDeployment_chain_contractName_idx" ON "ContractDeployment"("chain", "contractName");
