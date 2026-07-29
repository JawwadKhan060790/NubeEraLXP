using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class TeacherSchoolConfiguration : IEntityTypeConfiguration<TeacherSchool>
{
    public void Configure(EntityTypeBuilder<TeacherSchool> builder)
    {
        builder.ToTable("teacher_schools");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.IsPrimary).HasDefaultValue(false);
        builder.Property(x => x.AssignedBy).IsRequired();
        builder.Property(x => x.AssignedDate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(500);

        // Exactly one row, ever, per (Teacher, School) pair — same restore-on-reassign
        // pattern as the curriculum assignment tables.
        builder.HasIndex(x => new { x.TeacherId, x.SchoolId }).IsUnique();
        builder.HasIndex(x => x.TeacherId);
        builder.HasIndex(x => x.SchoolId);

        builder.HasOne(x => x.Teacher).WithMany(t => t.TeacherSchools)
            .HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict).IsRequired();
        builder.HasOne(x => x.School).WithMany(s => s.TeacherSchools)
            .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired();
    }
}
