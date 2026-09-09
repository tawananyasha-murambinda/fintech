-- Money moves from `double precision` to `numeric`, and sessions gain a
-- revocation timestamp.
--
-- DATA IMPACT: Postgres casts each existing value into the new scale, which
-- ROUNDS anything carrying more than the target number of decimal places
-- (2 for currency, 4 for rates and prices, 8 for share counts). For amounts
-- that arrived from Plaid or user input as 2dp values this is a no-op; any
-- sub-cent residue that a float accumulated is discarded, which is the point.
--
-- The conversion rewrites every row of the affected tables and takes an
-- ACCESS EXCLUSIVE lock for the duration. Take a backup first and run it in a
-- maintenance window once these tables are large.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionsValidFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "runningBalance" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Bill" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ManualTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "value" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Liability" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "interestRate" SET DATA TYPE DECIMAL(7,4),
ALTER COLUMN "minPayment" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "DebtPlan" ALTER COLUMN "extraPayment" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "totalInterestSaved" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "TaxEntry" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Investment" ALTER COLUMN "shares" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "costBasis" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "currentPrice" SET DATA TYPE DECIMAL(14,4);

-- AlterTable
ALTER TABLE "Vault" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(14,2);

