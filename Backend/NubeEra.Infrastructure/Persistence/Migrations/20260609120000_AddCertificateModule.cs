using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NubeEra.Infrastructure.Persistence.DbContext;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260609120000_AddCertificateModule")]
    public partial class AddCertificateModule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL so all char(36) FK columns get the correct
            // CHARACTER SET ascii COLLATE ascii_general_ci to match referenced tables.
            migrationBuilder.Sql(@"SET FOREIGN_KEY_CHECKS=0;");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `certificate_templates` (
                    `Id`                     char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                    `Name`                   varchar(200) NOT NULL,
                    `ProgramType`            varchar(50)  NOT NULL,
                    `GradeBand`              varchar(10)  NOT NULL,
                    `Description`            varchar(500) NULL,
                    `CertificateTitle`       varchar(200) NOT NULL DEFAULT 'CERTIFICATE OF ACHIEVEMENT',
                    `Tagline`                varchar(300) NULL,
                    `DefaultPrincipalName`   varchar(200) NULL,
                    `DefaultDirectorName`    varchar(200) NULL,
                    `DefaultStaffName`       varchar(200) NULL,
                    `DefaultStaffDesignation` varchar(100) NULL,
                    `IsActive`               tinyint(1)   NOT NULL DEFAULT 1,
                    `SchoolId`               char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
                    `CreatedAt`              datetime(6)  NOT NULL,
                    PRIMARY KEY (`Id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `certificates` (
                    `Id`                   char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                    `CertificateNumber`    varchar(50)  NOT NULL,
                    `QrCodeData`           varchar(500) NULL,
                    `StudentId`            char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                    `TemplateId`           char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
                    `SchoolId`             char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                    `IssuedByUserId`       char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                    `ApprovedByUserId`     char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
                    `StudentName`          varchar(200) NOT NULL,
                    `StudentIdNumber`      varchar(50)  NOT NULL,
                    `GradeName`            varchar(100) NOT NULL,
                    `GradeLevel`           int          NOT NULL,
                    `SchoolName`           varchar(200) NOT NULL,
                    `ParentName`           varchar(200) NULL,
                    `ProgramType`          varchar(50)  NOT NULL,
                    `CourseName`           varchar(300) NOT NULL,
                    `AcademicYear`         varchar(20)  NOT NULL,
                    `CompletionDate`       datetime(6)  NOT NULL,
                    `Percentage`           decimal(5,2) NULL,
                    `PerformanceLevel`     varchar(50)  NULL,
                    `Remarks`              varchar(500) NULL,
                    `Status`               varchar(30)  NOT NULL DEFAULT 'Draft',
                    `IsApproved`           tinyint(1)   NOT NULL DEFAULT 0,
                    `ApprovedAt`           datetime(6)  NULL,
                    `IsRevoked`            tinyint(1)   NOT NULL DEFAULT 0,
                    `RevokeReason`         varchar(500) NULL,
                    `RevokedAt`            datetime(6)  NULL,
                    `IsAvailableToStudent` tinyint(1)   NOT NULL DEFAULT 0,
                    `IssuedAt`             datetime(6)  NULL,
                    `ExpiryDate`           datetime(6)  NULL,
                    `DownloadCount`        int          NOT NULL DEFAULT 0,
                    `LastDownloadedAt`     datetime(6)  NULL,
                    `PrincipalName`        varchar(200) NULL,
                    `PrincipalDesignation` varchar(100) NULL,
                    `DirectorName`         varchar(200) NULL,
                    `DirectorDesignation`  varchar(100) NULL,
                    `StaffName`            varchar(200) NULL,
                    `StaffDesignation`     varchar(100) NULL,
                    `UpdatedByUserId`      varchar(36)  NULL,
                    `UpdatedAt`            datetime(6)  NULL,
                    `CreatedAt`            datetime(6)  NOT NULL,
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `IX_certificates_CertificateNumber` (`CertificateNumber`),
                    KEY `IX_certificates_StudentId`  (`StudentId`),
                    KEY `IX_certificates_SchoolId`   (`SchoolId`),
                    KEY `IX_certificates_TemplateId` (`TemplateId`),
                    KEY `IX_certificates_Status`     (`Status`),
                    CONSTRAINT `FK_certificates_students_StudentId`
                        FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_certificates_schools_SchoolId`
                        FOREIGN KEY (`SchoolId`)  REFERENCES `schools`  (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_certificates_certificate_templates_TemplateId`
                        FOREIGN KEY (`TemplateId`) REFERENCES `certificate_templates` (`Id`) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            migrationBuilder.Sql(@"SET FOREIGN_KEY_CHECKS=1;");

            // Seed default certificate templates
            migrationBuilder.Sql(@"
                INSERT IGNORE INTO `certificate_templates`
                    (`Id`, `Name`, `ProgramType`, `GradeBand`, `CertificateTitle`, `Tagline`, `IsActive`, `CreatedAt`)
                VALUES
                    ('a0000001-0000-0000-0000-000000000001','STEM Junior Explorer','STEM','1-3','CERTIFICATE OF ACHIEVEMENT','Sparking Young Minds with STEM',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000002','STEM Creative Builder','STEM','4-6','CERTIFICATE OF ACHIEVEMENT','Building Tomorrows Innovators',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000003','STEM Academic Scholar','STEM','7-8','CERTIFICATE OF COMPLETION','Excellence in STEM Education',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000004','STEM Professional Excellence','STEM','9-10','CERTIFICATE OF ACHIEVEMENT','Leading the Next Generation of Innovators',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000005','Robotics Champion','Robotics','1-10','CERTIFICATE OF COMPLETION','Mastering the Art of Robotics',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000006','AI Innovator','AI','1-10','CERTIFICATE OF ACHIEVEMENT','Harnessing the Power of Artificial Intelligence',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000007','Coding Excellence','Coding','1-10','CERTIFICATE OF COMPLETION','Crafting the Digital Future',1,'2026-06-09 12:00:00'),
                    ('a0000001-0000-0000-0000-000000000008','Academic Year Completion','AcademicYear','1-10','CERTIFICATE OF COMPLETION','A Year of Learning and Growth',1,'2026-06-09 12:00:00');
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "certificates");
            migrationBuilder.DropTable(name: "certificate_templates");
        }
    }
}
