using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class StudentDoubtConfiguration : IEntityTypeConfiguration<StudentDoubt>
{
    public void Configure(EntityTypeBuilder<StudentDoubt> builder)
    {
        builder.ToTable("student_doubts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.Title).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Description).HasColumnType("longtext");
        builder.Property(x => x.ScreenshotUrl).HasMaxLength(500);
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Open");
        builder.Property(x => x.TeacherReply).HasColumnType("longtext");

        // ── Relationships ────────────────────────────────────────────────────
        builder.HasOne(x => x.School)
               .WithMany()
               .HasForeignKey(x => x.SchoolId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Student)
               .WithMany()
               .HasForeignKey(x => x.StudentId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Grade)
               .WithMany()
               .HasForeignKey(x => x.GradeId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Section)
               .WithMany()
               .HasForeignKey(x => x.SectionId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Lesson)
               .WithMany()
               .HasForeignKey(x => x.LessonId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Module)
               .WithMany()
               .HasForeignKey(x => x.ModuleId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.RepliedByTeacher)
               .WithMany()
               .HasForeignKey(x => x.RepliedByTeacherId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);

        // ── Indexes ──────────────────────────────────────────────────────────
        builder.HasIndex(x => x.StudentId)
               .HasDatabaseName("IX_student_doubts_student");
        builder.HasIndex(x => new { x.SchoolId, x.Status })
               .HasDatabaseName("IX_student_doubts_school_status");
        builder.HasIndex(x => new { x.GradeId, x.SchoolId })
               .HasDatabaseName("IX_student_doubts_grade_school");
    }
}
