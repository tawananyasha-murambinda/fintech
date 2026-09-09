-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "anchorDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoundUpRule" ADD COLUMN     "maxPerTransaction" DECIMAL(14,2),
ADD COLUMN     "roundTo" DECIMAL(6,2) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "VaultContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'roundup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultContribution_transactionId_key" ON "VaultContribution"("transactionId");

-- CreateIndex
CREATE INDEX "VaultContribution_userId_createdAt_idx" ON "VaultContribution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VaultContribution_vaultId_createdAt_idx" ON "VaultContribution"("vaultId", "createdAt");

-- AddForeignKey
ALTER TABLE "VaultContribution" ADD CONSTRAINT "VaultContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultContribution" ADD CONSTRAINT "VaultContribution_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultContribution" ADD CONSTRAINT "VaultContribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Backfill: normalise existing categories onto the app's vocabulary.
--
-- Transactions imported before this migration hold Plaid's raw value
-- ("FOOD_AND_DRINK"), while budgets hold the app's ("Food & Dining"). The two
-- never matched, so every budget reported zero spend and no overspend alert
-- could fire. New rows are normalised on import by lib/categories.ts; these
-- statements bring the existing ones into line. The mapping mirrors
-- PLAID_PRIMARY and PLAID_LEGACY in that file — keep them in step.
-- ---------------------------------------------------------------------------

UPDATE "Transaction" SET "merchantCategory" = CASE upper("merchantCategory")
  WHEN 'INCOME'                    THEN 'Income'
  WHEN 'TRANSFER_IN'               THEN 'Transfer'
  WHEN 'TRANSFER_OUT'              THEN 'Transfer'
  WHEN 'LOAN_PAYMENTS'             THEN 'Loan Payments'
  WHEN 'BANK_FEES'                 THEN 'Fees & Charges'
  WHEN 'ENTERTAINMENT'             THEN 'Entertainment'
  WHEN 'FOOD_AND_DRINK'            THEN 'Food & Dining'
  WHEN 'GENERAL_MERCHANDISE'       THEN 'Shopping'
  WHEN 'HOME_IMPROVEMENT'          THEN 'Home Improvement'
  WHEN 'MEDICAL'                   THEN 'Health & Fitness'
  WHEN 'PERSONAL_CARE'             THEN 'Personal Care'
  WHEN 'GENERAL_SERVICES'          THEN 'Bills & Utilities'
  WHEN 'GOVERNMENT_AND_NON_PROFIT' THEN 'Taxes'
  WHEN 'TRANSPORTATION'            THEN 'Transportation'
  WHEN 'TRAVEL'                    THEN 'Travel'
  WHEN 'RENT_AND_UTILITIES'        THEN 'Bills & Utilities'
  -- Plaid's legacy category[0] values.
  WHEN 'FOOD AND DRINK'            THEN 'Food & Dining'
  WHEN 'SHOPS'                     THEN 'Shopping'
  WHEN 'RECREATION'                THEN 'Entertainment'
  WHEN 'HEALTHCARE'                THEN 'Health & Fitness'
  WHEN 'SERVICE'                   THEN 'Bills & Utilities'
  WHEN 'BANK FEES'                 THEN 'Fees & Charges'
  WHEN 'PAYMENT'                   THEN 'Loan Payments'
  WHEN 'TRANSFER'                  THEN 'Transfer'
  WHEN 'COMMUNITY'                 THEN 'Gifts & Donations'
  WHEN 'TAX'                       THEN 'Taxes'
  WHEN 'INTEREST'                  THEN 'Fees & Charges'
  WHEN 'CASH ADVANCE'              THEN 'Transfer'
  ELSE "merchantCategory"
END
WHERE "merchantCategory" IS NOT NULL;

-- Plaid appends a detail suffix on some values (FOOD_AND_DRINK_COFFEE); map
-- anything still holding an underscored code back to its primary category.
UPDATE "Transaction" SET "merchantCategory" = 'Food & Dining'
  WHERE "merchantCategory" LIKE 'FOOD\_AND\_DRINK\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Transportation'
  WHERE "merchantCategory" LIKE 'TRANSPORTATION\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Shopping'
  WHERE "merchantCategory" LIKE 'GENERAL\_MERCHANDISE\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Bills & Utilities'
  WHERE "merchantCategory" LIKE 'RENT\_AND\_UTILITIES\_%'
     OR "merchantCategory" LIKE 'GENERAL\_SERVICES\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Entertainment'
  WHERE "merchantCategory" LIKE 'ENTERTAINMENT\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Travel'
  WHERE "merchantCategory" LIKE 'TRAVEL\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Health & Fitness'
  WHERE "merchantCategory" LIKE 'MEDICAL\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Personal Care'
  WHERE "merchantCategory" LIKE 'PERSONAL\_CARE\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Loan Payments'
  WHERE "merchantCategory" LIKE 'LOAN\_PAYMENTS\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Transfer'
  WHERE "merchantCategory" LIKE 'TRANSFER\_IN\_%' OR "merchantCategory" LIKE 'TRANSFER\_OUT\_%';
UPDATE "Transaction" SET "merchantCategory" = 'Income'
  WHERE "merchantCategory" LIKE 'INCOME\_%';

-- Budgets were created from a title-case list, so most are already canonical;
-- these two are the spellings an older build could produce.
UPDATE "Budget" SET "category" = 'Food & Dining' WHERE lower("category") IN ('food and dining', 'food');
UPDATE "Budget" SET "category" = 'Bills & Utilities' WHERE lower("category") IN ('bills and utilities', 'bills', 'utilities');
