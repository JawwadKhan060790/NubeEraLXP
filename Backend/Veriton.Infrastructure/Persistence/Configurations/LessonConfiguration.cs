using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> builder)
    {
        builder.ToTable("lessons");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.SubTopic).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Activity).HasColumnType("longtext");
        builder.Property(x => x.VideoUrl).HasMaxLength(500);
        builder.Property(x => x.VideoUrls).HasColumnType("longtext"); // JSON array of ordered URLs
        builder.Property(x => x.DiagramUrl).HasColumnType("longtext");
        builder.Property(x => x.Source).HasColumnType("longtext");
        builder.Property(x => x.Code).HasColumnType("longtext");
        builder.Property(x => x.Procedure).HasColumnType("longtext");
        builder.Property(x => x.RequiredMaterial).HasColumnType("longtext");
        builder.Property(x => x.WhatYouGet).HasColumnType("longtext");
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.DisplayOrder).HasDefaultValue(0);

        builder.HasOne(x => x.Module).WithMany(x => x.Lessons).HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.CreatedByTeacher).WithMany(x => x.Lessons).HasForeignKey(x => x.CreatedByTeacherId).OnDelete(DeleteBehavior.Restrict);

        // Performance indexes for paginated list queries
        builder.HasIndex(x => x.ModuleId).HasDatabaseName("IX_lessons_module");
        builder.HasIndex(x => new { x.ModuleId, x.IsActive }).HasDatabaseName("IX_lessons_module_active");
    }
}
