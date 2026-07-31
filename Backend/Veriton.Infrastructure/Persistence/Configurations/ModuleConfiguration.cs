using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ModuleConfiguration : IEntityTypeConfiguration<Module>
{
    public void Configure(EntityTypeBuilder<Module> builder)
    {
        builder.ToTable("modules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.GradeLevel).WithMany(x => x.Modules).HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Subject).WithMany(x => x.Modules).HasForeignKey(x => x.SubjectId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.CreatedByTeacher).WithMany(x => x.Modules).HasForeignKey(x => x.CreatedByTeacherId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);

        // Units are master content shared across all schools: one Unit name per grade level, globally.
        builder.HasIndex(x => new { x.GradeLevelId, x.Name }).IsUnique();

        // Performance indexes for paginated list queries
        builder.HasIndex(x => x.IsActive).HasDatabaseName("IX_modules_active");
        builder.HasIndex(x => x.GradeLevelId).HasDatabaseName("IX_modules_grade_level");
    }
}