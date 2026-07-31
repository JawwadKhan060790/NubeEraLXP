using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSchoolIdAndLegacyGradeIdFromModuleLesson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeDropForeignKey;
                CREATE PROCEDURE SafeDropForeignKey(IN tbl VARCHAR(64), IN constraintName VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_schema = DATABASE()
                          AND table_name = tbl
                          AND constraint_name = constraintName
                          AND constraint_type = 'FOREIGN KEY'
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` DROP FOREIGN KEY `', constraintName, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeDropForeignKey('modules', 'FK_modules_grades_GradeId')");
            migrationBuilder.Sql("CALL SafeDropForeignKey('modules', 'FK_modules_schools_SchoolId')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeDropForeignKey");

            // Drop indexes safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeDropIndex;
                CREATE PROCEDURE SafeDropIndex(IN tbl VARCHAR(64), IN idx VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = idx
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idx, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeDropIndex('modules', 'IX_modules_school_active')");
            migrationBuilder.Sql("CALL SafeDropIndex('modules', 'IX_modules_SchoolId_GradeId_Name')");
            migrationBuilder.Sql("CALL SafeDropIndex('lessons', 'IX_lessons_school_active')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeDropIndex");

            // Drop columns safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeDropColumn;
                CREATE PROCEDURE SafeDropColumn(IN tbl VARCHAR(64), IN col VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = col
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', col, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeDropColumn('modules', 'SchoolId')");
            migrationBuilder.Sql("CALL SafeDropColumn('lessons', 'SchoolId')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeDropColumn");

            // Rename columns safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeRenameColumn;
                CREATE PROCEDURE SafeRenameColumn(IN tbl VARCHAR(64), IN oldCol VARCHAR(64), IN newCol VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = oldCol
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = newCol
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` RENAME COLUMN `', oldCol, '` TO `', newCol, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeRenameColumn('modules', 'GradeId', 'GradeLevelId')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeRenameColumn");

            // Rename indexes safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeRenameIndex;
                CREATE PROCEDURE SafeRenameIndex(IN tbl VARCHAR(64), IN oldIdx VARCHAR(64), IN newIdx VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = oldIdx
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = newIdx
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` RENAME INDEX `', oldIdx, '` TO `', newIdx, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeRenameIndex('modules', 'IX_modules_grade', 'IX_modules_grade_level')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeRenameIndex");

            // Create indexes safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeCreateIndex;
                CREATE PROCEDURE SafeCreateIndex(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255))
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = idx
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            
            migrationBuilder.Sql("CALL SafeCreateIndex('modules', 'IX_modules_active', 'IsActive')");
            migrationBuilder.Sql("CALL SafeCreateIndex('modules', 'IX_modules_GradeLevelId_Name', 'GradeLevelId, Name')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeCreateIndex");

            // Add foreign key safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeAddForeignKey;
                CREATE PROCEDURE SafeAddForeignKey(IN tbl VARCHAR(64), IN fkName VARCHAR(64), IN col VARCHAR(64), IN refTbl VARCHAR(64), IN refCol VARCHAR(64))
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_schema = DATABASE()
                          AND table_name = tbl
                          AND constraint_name = fkName
                          AND constraint_type = 'FOREIGN KEY'
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fkName, '` FOREIGN KEY (`', col, '`) REFERENCES `', refTbl, '` (`', refCol, '`) ON DELETE RESTRICT');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");

            migrationBuilder.Sql("CALL SafeAddForeignKey('modules', 'FK_modules_grade_levels_GradeLevelId', 'GradeLevelId', 'grade_levels', 'Id')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeAddForeignKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeDropForeignKey;
                CREATE PROCEDURE SafeDropForeignKey(IN tbl VARCHAR(64), IN constraintName VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_schema = DATABASE()
                          AND table_name = tbl
                          AND constraint_name = constraintName
                          AND constraint_type = 'FOREIGN KEY'
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` DROP FOREIGN KEY `', constraintName, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeDropForeignKey('modules', 'FK_modules_grade_levels_GradeLevelId')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeDropForeignKey");

            // Drop indexes safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeDropIndex;
                CREATE PROCEDURE SafeDropIndex(IN tbl VARCHAR(64), IN idx VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = idx
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idx, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeDropIndex('modules', 'IX_modules_active')");
            migrationBuilder.Sql("CALL SafeDropIndex('modules', 'IX_modules_GradeLevelId_Name')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeDropIndex");

            // Rename column back
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeRenameColumn;
                CREATE PROCEDURE SafeRenameColumn(IN tbl VARCHAR(64), IN oldCol VARCHAR(64), IN newCol VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = oldCol
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = newCol
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` RENAME COLUMN `', oldCol, '` TO `', newCol, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeRenameColumn('modules', 'GradeLevelId', 'GradeId')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeRenameColumn");

            // Rename index back
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeRenameIndex;
                CREATE PROCEDURE SafeRenameIndex(IN tbl VARCHAR(64), IN oldIdx VARCHAR(64), IN newIdx VARCHAR(64))
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = oldIdx
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = newIdx
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` RENAME INDEX `', oldIdx, '` TO `', newIdx, '`');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeRenameIndex('modules', 'IX_modules_grade_level', 'IX_modules_grade')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeRenameIndex");

            // Add columns safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeAddColumn;
                CREATE PROCEDURE SafeAddColumn(IN tbl VARCHAR(64), IN col VARCHAR(64), IN colDef VARCHAR(255))
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND column_name = col
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', colDef);
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeAddColumn('modules', 'SchoolId', 'char(36) NULL')");
            migrationBuilder.Sql("CALL SafeAddColumn('lessons', 'SchoolId', 'char(36) NULL')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeAddColumn");

            // Create indexes safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeCreateIndex;
                CREATE PROCEDURE SafeCreateIndex(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255), IN isUnique TINYINT)
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tbl
                          AND index_name = idx
                    ) THEN
                        IF isUnique = 1 THEN
                            SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD UNIQUE INDEX `', idx, '` (', cols, ')');
                        ELSE
                            SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
                        END IF;
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeCreateIndex('modules', 'IX_modules_school_active', 'SchoolId, IsActive', 0)");
            migrationBuilder.Sql("CALL SafeCreateIndex('modules', 'IX_modules_SchoolId_GradeId_Name', 'SchoolId, GradeId, Name', 1)");
            migrationBuilder.Sql("CALL SafeCreateIndex('lessons', 'IX_lessons_school_active', 'SchoolId, IsActive', 0)");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeCreateIndex");

            // Add foreign keys safely
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS SafeAddForeignKey;
                CREATE PROCEDURE SafeAddForeignKey(IN tbl VARCHAR(64), IN fkName VARCHAR(64), IN col VARCHAR(64), IN refTbl VARCHAR(64), IN refCol VARCHAR(64))
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_schema = DATABASE()
                          AND table_name = tbl
                          AND constraint_name = fkName
                          AND constraint_type = 'FOREIGN KEY'
                    ) THEN
                        SET @sqlStr = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fkName, '` FOREIGN KEY (`', col, '`) REFERENCES `', refTbl, '` (`', refCol, '`) ON DELETE RESTRICT');
                        PREPARE stmt FROM @sqlStr;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;");
            migrationBuilder.Sql("CALL SafeAddForeignKey('modules', 'FK_modules_grades_GradeId', 'GradeId', 'grades', 'Id')");
            migrationBuilder.Sql("CALL SafeAddForeignKey('modules', 'FK_modules_schools_SchoolId', 'SchoolId', 'schools', 'Id')");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS SafeAddForeignKey");
        }
    }
}
