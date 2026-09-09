-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "assets" DECIMAL(14,2) NOT NULL,
    "liabilities" DECIMAL(14,2) NOT NULL,
    "netWorth" DECIMAL(14,2) NOT NULL,
    "cash" DECIMAL(14,2) NOT NULL,
    "investments" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetWorthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_userId_date_idx" ON "NetWorthSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_userId_date_key" ON "NetWorthSnapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "NetWorthSnapshot" ADD CONSTRAINT "NetWorthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

