using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class GradeConfiguration : IEntityTypeConfiguration<Grade>
{
    public void Configure(EntityTypeBuilder<Grade> builder)
    {
        builder.ToTable("grades");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.GradeLevelId).HasColumnType("char(36)");
        
        builder.Property(x => x.GradeLevel).IsRequired().HasMaxLength(10);
        builder.Property(x => x.GradeName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.AcademicYear).HasMaxLength(20);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        
        builder.HasOne(x => x.School).WithMany(x => x.Grades).HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
        builder.HasOne(x => x.ClassTeacher).WithMany(x => x.ClassTeacherGrades).HasForeignKey(x => x.ClassTeacherId).OnDelete(DeleteBehavior.SetNull);

        // Authoritative master-data link. Restrict delete so a GradeLevel can't be
        // removed while school-grade mappings still reference it; nullable/optional
        // (no .IsRequired()) for backward compatibility with rows not yet backfilled.
        builder.HasOne(x => x.Level).WithMany(l => l.Grades).HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.SchoolId, x.GradeLevel, x.AcademicYear }).IsUnique();
        builder.HasIndex(x => x.GradeLevelId);

        // DB-level guard: GradeLevel must be a numeric string -1 to 10, optionally suffixed
        // with "st"/"nd"/"rd"/"th" (e.g. "-1", "0", "5", "10").
        // Mirrors the service-layer validation in GradeService and GradeCreateValidator.
        builder.HasCheckConstraint(
            "CK_grades_GradeLevel_minus1_to_10",
            "`GradeLevel` REGEXP '^(10|[1-9]|0|-1)(st|nd|rd|th)?$'");
    }
}
