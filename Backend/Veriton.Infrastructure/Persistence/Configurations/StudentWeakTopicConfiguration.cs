using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class StudentWeakTopicConfiguration : IEntityTypeConfiguration<StudentWeakTopic>
{
    public void Configure(EntityTypeBuilder<StudentWeakTopic> builder)
    {
        builder.ToTable("StudentWeakTopics");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.WeaknessLevel)
               .HasConversion<string>()
               .HasMaxLength(20)
               .IsRequired();

        builder.Property(x => x.Source)
               .HasConversion<string>()
               .HasMaxLength(20)
               .IsRequired();

        builder.Property(x => x.Score).HasColumnType("decimal(8,2)");
        builder.Property(x => x.MaxScore).HasColumnType("decimal(8,2)");
        builder.Property(x => x.RecommendedRevision).HasMaxLength(2000);

        // Performance indexes
        builder.HasIndex(x => new { x.StudentId, x.LessonId });
        builder.HasIndex(x => new { x.SchoolId, x.GradeId });
        builder.HasIndex(x => new { x.StudentId, x.IsResolved });

        builder.HasOne(x => x.School)
               .WithMany()
               .HasForeignKey(x => x.SchoolId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Student)
               .WithMany()
               .HasForeignKey(x => x.StudentId)
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
    }
}
