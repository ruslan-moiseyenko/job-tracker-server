-- Data Migration Script: Refactor Company Flags
-- This script migrates isBlacklisted and isFavorite from CompanyNote to Company

-- Step 1: Add new columns to Company table (this is already done by Prisma)
-- ALTER TABLE companies ADD COLUMN is_favorite BOOLEAN DEFAULT false;
-- ALTER TABLE companies ADD COLUMN is_blacklisted BOOLEAN DEFAULT false;

-- Step 2: Migrate existing data from CompanyNote to Company
-- Update Company flags based on existing CompanyNote data
UPDATE companies 
SET 
  is_favorite = COALESCE(cn.is_favorite, false),
  is_blacklisted = COALESCE(cn.is_blacklisted, false)
FROM company_notes cn 
WHERE companies.id = cn.company_id;

-- Step 3: Add indexes for the new Company columns (this is already done by Prisma)
-- CREATE INDEX companies_user_id_is_favorite_idx ON companies(user_id, is_favorite);
-- CREATE INDEX companies_user_id_is_blacklisted_idx ON companies(user_id, is_blacklisted);

-- Step 4: Remove old columns from CompanyNote table (this is already done by Prisma)
-- ALTER TABLE company_notes DROP COLUMN is_favorite;
-- ALTER TABLE company_notes DROP COLUMN is_blacklisted;
-- ALTER TABLE company_notes DROP COLUMN user_id;

-- Step 5: Drop old indexes (this is already done by Prisma)
-- DROP INDEX IF EXISTS company_notes_is_blacklisted_idx;
-- DROP INDEX IF EXISTS company_notes_is_favorite_idx;
-- DROP INDEX IF EXISTS company_notes_company_id_user_id_key;

-- Note: Steps 1, 3, 4, and 5 are automatically handled by Prisma migration.
-- Only Step 2 (data migration) needs to be run manually if there's existing data.
