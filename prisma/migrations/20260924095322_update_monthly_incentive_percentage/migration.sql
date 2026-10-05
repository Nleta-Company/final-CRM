/*
  Update monthly incentive payout from amount to percentage.
*/

-- 1. Add the new column as nullable temporarily
ALTER TABLE "IncentivePayout"
ADD COLUMN "totalIncentivePercent" DECIMAL(7,2);

-- 2. Preserve existing data
UPDATE "IncentivePayout"
SET "totalIncentivePercent" = "totalIncentive";

-- 3. Make the new column required
ALTER TABLE "IncentivePayout"
ALTER COLUMN "totalIncentivePercent" SET NOT NULL;

-- 4. Remove the old column
ALTER TABLE "IncentivePayout"
DROP COLUMN "totalIncentive";