-- ============================================================
-- Soft Delete Migration: AddSoftDeleteColumns
-- Adds IsDeleted, DeletedDate, DeletedBy to all 44 tables
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- Helper: adds columns only if they don't already exist
-- Run each ALTER TABLE separately so one failure doesn't block the rest

-- ── Attendances ──────────────────────────────────────────────
ALTER TABLE `Attendances`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_Attendances_IsDeleted` ON `Attendances` (`IsDeleted`);

-- ── backup_audit_logs ────────────────────────────────────────
ALTER TABLE `backup_audit_logs`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_backup_audit_logs_IsDeleted` ON `backup_audit_logs` (`IsDeleted`);

-- ── backup_histories ─────────────────────────────────────────
ALTER TABLE `backup_histories`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_backup_histories_IsDeleted` ON `backup_histories` (`IsDeleted`);

-- ── CartItems ────────────────────────────────────────────────
ALTER TABLE `CartItems`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_CartItems_IsDeleted` ON `CartItems` (`IsDeleted`);

-- ── certificate_templates ────────────────────────────────────
ALTER TABLE `certificate_templates`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_certificate_templates_IsDeleted` ON `certificate_templates` (`IsDeleted`);

-- ── certificates ─────────────────────────────────────────────
ALTER TABLE `certificates`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_certificates_IsDeleted` ON `certificates` (`IsDeleted`);

-- ── EventAuditLogs ───────────────────────────────────────────
ALTER TABLE `EventAuditLogs`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_EventAuditLogs_IsDeleted` ON `EventAuditLogs` (`IsDeleted`);

-- ── EventRegistrations ───────────────────────────────────────
ALTER TABLE `EventRegistrations`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_EventRegistrations_IsDeleted` ON `EventRegistrations` (`IsDeleted`);

-- ── Events ───────────────────────────────────────────────────
ALTER TABLE `Events`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_Events_IsDeleted` ON `Events` (`IsDeleted`);

-- ── exams ─────────────────────────────────────────────────────
ALTER TABLE `exams`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_exams_IsDeleted` ON `exams` (`IsDeleted`);

-- ── grade_levels ─────────────────────────────────────────────
ALTER TABLE `grade_levels`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_grade_levels_IsDeleted` ON `grade_levels` (`IsDeleted`);

-- ── grades ───────────────────────────────────────────────────
ALTER TABLE `grades`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_grades_IsDeleted` ON `grades` (`IsDeleted`);

-- ── InAppNotifications ───────────────────────────────────────
ALTER TABLE `InAppNotifications`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_InAppNotifications_IsDeleted` ON `InAppNotifications` (`IsDeleted`);

-- ── LessonCompletions ────────────────────────────────────────
ALTER TABLE `LessonCompletions`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_LessonCompletions_IsDeleted` ON `LessonCompletions` (`IsDeleted`);

-- ── lessons ───────────────────────────────────────────────────
ALTER TABLE `lessons`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_lessons_IsDeleted` ON `lessons` (`IsDeleted`);

-- ── modules ───────────────────────────────────────────────────
ALTER TABLE `modules`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_modules_IsDeleted` ON `modules` (`IsDeleted`);

-- ── OrderItems ────────────────────────────────────────────────
ALTER TABLE `OrderItems`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_OrderItems_IsDeleted` ON `OrderItems` (`IsDeleted`);

-- ── Orders ────────────────────────────────────────────────────
ALTER TABLE `Orders`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_Orders_IsDeleted` ON `Orders` (`IsDeleted`);

-- ── ProductCategories ─────────────────────────────────────────
ALTER TABLE `ProductCategories`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_ProductCategories_IsDeleted` ON `ProductCategories` (`IsDeleted`);

-- ── Products ──────────────────────────────────────────────────
ALTER TABLE `Products`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_Products_IsDeleted` ON `Products` (`IsDeleted`);

-- ── questions ─────────────────────────────────────────────────
ALTER TABLE `questions`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_questions_IsDeleted` ON `questions` (`IsDeleted`);

-- ── report_card_activities ────────────────────────────────────
ALTER TABLE `report_card_activities`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_report_card_activities_IsDeleted` ON `report_card_activities` (`IsDeleted`);

-- ── report_card_grading_rules ─────────────────────────────────
ALTER TABLE `report_card_grading_rules`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_report_card_grading_rules_IsDeleted` ON `report_card_grading_rules` (`IsDeleted`);

-- ── report_card_skills ────────────────────────────────────────
ALTER TABLE `report_card_skills`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_report_card_skills_IsDeleted` ON `report_card_skills` (`IsDeleted`);

-- ── report_card_subjects ──────────────────────────────────────
ALTER TABLE `report_card_subjects`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_report_card_subjects_IsDeleted` ON `report_card_subjects` (`IsDeleted`);

-- ── report_cards ──────────────────────────────────────────────
ALTER TABLE `report_cards`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_report_cards_IsDeleted` ON `report_cards` (`IsDeleted`);

-- ── results ───────────────────────────────────────────────────
ALTER TABLE `results`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_results_IsDeleted` ON `results` (`IsDeleted`);

-- ── roles ─────────────────────────────────────────────────────
ALTER TABLE `roles`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_roles_IsDeleted` ON `roles` (`IsDeleted`);

-- ── schedulers ────────────────────────────────────────────────
ALTER TABLE `schedulers`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_schedulers_IsDeleted` ON `schedulers` (`IsDeleted`);

-- ── schools ───────────────────────────────────────────────────
ALTER TABLE `schools`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_schools_IsDeleted` ON `schools` (`IsDeleted`);

-- ── StudentNotes ──────────────────────────────────────────────
ALTER TABLE `StudentNotes`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_StudentNotes_IsDeleted` ON `StudentNotes` (`IsDeleted`);

-- ── StudentPythonCodes ────────────────────────────────────────
ALTER TABLE `StudentPythonCodes`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_StudentPythonCodes_IsDeleted` ON `StudentPythonCodes` (`IsDeleted`);

-- ── students ──────────────────────────────────────────────────
ALTER TABLE `students`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_students_IsDeleted` ON `students` (`IsDeleted`);

-- ── system_settings ───────────────────────────────────────────
ALTER TABLE `system_settings`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_system_settings_IsDeleted` ON `system_settings` (`IsDeleted`);

-- ── teachers ──────────────────────────────────────────────────
ALTER TABLE `teachers`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_teachers_IsDeleted` ON `teachers` (`IsDeleted`);

-- ── TicketAttachments ─────────────────────────────────────────
ALTER TABLE `TicketAttachments`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_TicketAttachments_IsDeleted` ON `TicketAttachments` (`IsDeleted`);

-- ── TicketCategories ──────────────────────────────────────────
ALTER TABLE `TicketCategories`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_TicketCategories_IsDeleted` ON `TicketCategories` (`IsDeleted`);

-- ── TicketComments ────────────────────────────────────────────
ALTER TABLE `TicketComments`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_TicketComments_IsDeleted` ON `TicketComments` (`IsDeleted`);

-- ── TicketHistories ───────────────────────────────────────────
ALTER TABLE `TicketHistories`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_TicketHistories_IsDeleted` ON `TicketHistories` (`IsDeleted`);

-- ── Tickets ───────────────────────────────────────────────────
ALTER TABLE `Tickets`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_Tickets_IsDeleted` ON `Tickets` (`IsDeleted`);

-- ── UploadedFiles ─────────────────────────────────────────────
ALTER TABLE `UploadedFiles`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_UploadedFiles_IsDeleted` ON `UploadedFiles` (`IsDeleted`);

-- ── users ─────────────────────────────────────────────────────
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_users_IsDeleted` ON `users` (`IsDeleted`);

-- ── WebsiteRegistrations ──────────────────────────────────────
ALTER TABLE `WebsiteRegistrations`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_WebsiteRegistrations_IsDeleted` ON `WebsiteRegistrations` (`IsDeleted`);

-- ── WishlistItems ─────────────────────────────────────────────
ALTER TABLE `WishlistItems`
    ADD COLUMN IF NOT EXISTS `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `DeletedDate` datetime(6) NULL,
    ADD COLUMN IF NOT EXISTS `DeletedBy` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;
CREATE INDEX IF NOT EXISTS `IX_WishlistItems_IsDeleted` ON `WishlistItems` (`IsDeleted`);

-- ── Mark migration as applied in EF Core history ─────────────
INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260612000001_AddSoftDeleteColumns', '9.0.0');

SET foreign_key_checks = 1;

SELECT 'Soft delete columns applied successfully to all 44 tables.' AS Result;
