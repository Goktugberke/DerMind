-- V7: Fix streaks_usage_frequency_check constraint to include TWICE_WEEKLY
-- Hibernate ddl-auto=update sometimes fails to update Enum check constraints when new values are added.

ALTER TABLE streaks DROP CONSTRAINT IF EXISTS streaks_usage_frequency_check;

ALTER TABLE streaks ADD CONSTRAINT streaks_usage_frequency_check 
CHECK (usage_frequency IN ('DAILY', 'TWICE_DAILY', 'ONCE_WEEKLY', 'TWICE_WEEKLY', 'ALTERNATE_DAYS'));
