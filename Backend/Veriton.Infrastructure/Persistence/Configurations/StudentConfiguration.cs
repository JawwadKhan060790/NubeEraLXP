using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class StudentConfiguration : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("students");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.StudentId).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => new { x.SchoolId, x.StudentId }).IsUnique();

        builder.Property(x => x.RollNo).HasMaxLength(20);
        builder.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.LastName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.HasIndex(x => x.Email);

        // ── Performance indexes for large-dataset list queries ─────────────────
        // Covers the primary list query: WHERE SchoolId = ? AND IsActive = 1
        // ORDER BY FirstName, LastName  (the default sort for the paginated list)
        builder.HasIndex(x => new { x.SchoolId, x.IsActive, x.FirstName, x.LastName })
               .HasDatabaseName("IX_students_school_active_name");

        // Covers grade-level filtering added in the paginated endpoint
        builder.HasIndex(x => new { x.GradeId, x.IsActive })
               .HasDatabaseName("IX_students_grade_active");

        builder.Property(x => x.Phone).HasMaxLength(20);
        builder.Property(x => x.Gender).HasMaxLength(10);
        builder.Property(x => x.BloodGroup).HasMaxLength(10);
        builder.Property(x => x.ParentGuardianName).HasMaxLength(200);
        builder.Property(x => x.ParentGuardianPhone).HasMaxLength(20);
        builder.Property(x => x.ProfilePictureUrl).HasMaxLength(500);
        builder.Property(x => x.PersonalNote).HasColumnType("text");
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.School).WithMany(x => x.Students).HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Grade).WithMany(x => x.Students).HasForeignKey(x => x.GradeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.User).WithOne(x => x.StudentProfile).HasForeignKey<Student>(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}