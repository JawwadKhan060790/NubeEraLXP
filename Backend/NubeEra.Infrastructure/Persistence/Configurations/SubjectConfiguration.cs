using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class SubjectConfiguration : IEntityTypeConfiguration<Subject>
{
    public void Configure(EntityTypeBuilder<Subject> builder)
    {
        builder.ToTable("subjects");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.GradeLevel)
            .WithMany(x => x.Subjects)
            .HasForeignKey(x => x.GradeLevelId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CreatedByTeacher)
            .WithMany()
            .HasForeignKey(x => x.CreatedByTeacherId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // One Subject name per grade level globally
        builder.HasIndex(x => new { x.GradeLevelId, x.Name }).IsUnique();

        // Performance indexes for queries
        builder.HasIndex(x => x.IsActive).HasDatabaseName("IX_subjects_active");
        builder.HasIndex(x => x.GradeLevelId).HasDatabaseName("IX_subjects_grade_level");
    }
}
