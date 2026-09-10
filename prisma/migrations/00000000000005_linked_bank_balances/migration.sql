-- AlterTable
ALTER TABLE "LinkedBank" ADD COLUMN     "availableBalance" DECIMAL(14,2),
ADD COLUMN     "balanceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "currentBalance" DECIMAL(14,2);

