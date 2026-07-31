using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ReportCardConfiguration : IEntityTypeConfiguration<ReportCard>
{
    public void Configure(EntityTypeBuilder<ReportCard> builder)
    {
        builder.ToTable("report_cards");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.SchoolId).HasColumnType("char(36)");
        builder.Property(x => x.StudentId).HasColumnType("char(36)");
        builder.Property(x => x.GradeId).HasColumnType("char(36)");
        builder.Property(x => x.GeneratedByUserId).HasColumnType("char(36)");
        builder.Property(x => x.ApprovedByUserId).HasColumnType("char(36)");
        builder.Property(x => x.PublishedByUserId).HasColumnType("char(36)");

        builder.Property(x => x.ReportCardNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.ReportCardNumber).IsUnique();

        builder.Property(x => x.AcademicYear).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ExamType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ExamName).HasMaxLength(200);
        builder.Property(x => x.StudentName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.StudentIdNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.RollNo).HasMaxLength(50);
        builder.Property(x => x.GradeName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Section).HasMaxLength(50);
        builder.Property(x => x.SchoolName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.SchoolAddress).HasMaxLength(500);
        builder.Property(x => x.SchoolLogoUrl).HasMaxLength(500);
        builder.Property(x => x.SchoolContact).HasMaxLength(100);
        builder.Property(x => x.ParentName).HasMaxLength(200);
        builder.Property(x => x.ParentContact).HasMaxLength(100);
        builder.Property(x => x.OverallGrade).HasMaxLength(10);
        builder.Property(x => x.Percentage).HasPrecision(5, 2);
        builder.Property(x => x.GPA).HasPrecision(4, 2);
        builder.Property(x => x.Rank).HasColumnName("ClassRank");
        builder.Property(x => x.AttendancePercentage).HasPrecision(5, 2);
        builder.Property(x => x.TotalMarks).HasPrecision(8, 2);
        builder.Property(x => x.ObtainedMarks).HasPrecision(8, 2);
        builder.Property(x => x.TeacherRemarks).HasMaxLength(1000);
        builder.Property(x => x.PrincipalRemarks).HasMaxLength(1000);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20).HasDefaultValue("Draft");
        builder.Property(x => x.IsVisibleToStudent).HasDefaultValue(false);
        builder.Property(x => x.IsVisibleToParent).HasDefaultValue(false);
        builder.Property(x => x.QrCodeData).HasMaxLength(500);
        builder.Property(x => x.DownloadCount).HasDefaultValue(0);
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(36);
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasIndex(x => new { x.SchoolId, x.AcademicYear });
        builder.HasIndex(x => new { x.StudentId, x.AcademicYear });
        builder.HasIndex(x => x.Status);

        builder.HasOne(x => x.School)
            .WithMany()
            .HasForeignKey(x => x.SchoolId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Student)
            .WithMany()
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Grade)
            .WithMany()
            .HasForeignKey(x => x.GradeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Subjects)
            .WithOne(x => x.ReportCard)
            .HasForeignKey(x => x.ReportCardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Activities)
            .WithOne(x => x.ReportCard)
            .HasForeignKey(x => x.ReportCardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Skills)
            .WithOne(x => x.ReportCard)
            .HasForeignKey(x => x.ReportCardId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
