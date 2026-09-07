-- =============================================================================
-- Migration: Add Username to users table & Backfill Accounts
-- =============================================================================

-- 1. Add Username column if not exists
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "Username";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN `Username` varchar(100) NULL AFTER `Email`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create Index on Username if not exists
SET @indexname = "IX_users_Username";
SET @preparedStatementIdx = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  "SELECT 1",
  "CREATE INDEX `IX_users_Username` ON `users` (`Username`);"
));
PREPARE createIndexIfNotExists FROM @preparedStatementIdx;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- 3. Backfill all existing accounts:
--    - For all standard accounts (Admin, Staff, Teacher, Student): set Username = Email
--    - For all Parent accounts (IsParent = 1): set Username = Phone number (or fallback to Email)
UPDATE `users`
SET `Username` = CASE
    WHEN `IsParent` = 1 AND `Phone` IS NOT NULL AND TRIM(`Phone`) != '' THEN TRIM(`Phone`)
    WHEN `IsParent` = 1 AND (`Phone` IS NULL OR TRIM(`Phone`) = '') THEN `Email`
    ELSE `Email`
END
WHERE `Username` IS NULL OR `Username` = '';

-- 4. Record migration in __EFMigrationsHistory if table exists
INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
SELECT '20260906160000_AddUsernameToUser', '8.0.2'
WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '__EFMigrationsHistory')
  AND NOT EXISTS (SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260906160000_AddUsernameToUser');

