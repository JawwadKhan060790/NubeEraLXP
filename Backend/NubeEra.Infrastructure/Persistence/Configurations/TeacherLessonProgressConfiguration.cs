using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class TeacherLessonProgressConfiguration : IEntityTypeConfiguration<TeacherLessonProgress>
{
    public void Configure(EntityTypeBuilder<TeacherLessonProgress> builder)
    {
        builder.ToTable("TeacherLessonProgresses");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status)
               .HasConversion<string>()
               .HasMaxLength(20)
               .IsRequired();

        builder.Property(x => x.Remarks).HasMaxLength(1000);

        // Unique: one progress record per teacher+grade+lesson+section
        builder.HasIndex(x => new { x.TeacherId, x.GradeId, x.LessonId, x.SectionId }).IsUnique();
        // Performance indexes
        builder.HasIndex(x => new { x.SchoolId, x.TeacherId });
        builder.HasIndex(x => new { x.GradeId, x.TeacherId });
        builder.HasIndex(x => new { x.ModuleId, x.TeacherId });

        builder.HasOne(x => x.School)
               .WithMany()
               .HasForeignKey(x => x.SchoolId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Teacher)
               .WithMany()
               .HasForeignKey(x => x.TeacherId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Grade)
               .WithMany()
               .HasForeignKey(x => x.GradeId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Module)
               .WithMany()
               .HasForeignKey(x => x.ModuleId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Lesson)
               .WithMany()
               .HasForeignKey(x => x.LessonId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Section)
               .WithMany()
               .HasForeignKey(x => x.SectionId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
