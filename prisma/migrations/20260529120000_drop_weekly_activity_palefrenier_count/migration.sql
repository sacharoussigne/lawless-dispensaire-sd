-- Drop palefrenier counter from weekly activity (legacy history enum values kept in DB).
ALTER TABLE "dispensary_weekly_activity" DROP COLUMN "palefrenierCount";
