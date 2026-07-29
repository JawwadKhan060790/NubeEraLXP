using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class TeacherRatingConfiguration : IEntityTypeConfiguration<TeacherRating>
{
    public void Configure(EntityTypeBuilder<TeacherRating> builder)
    {
        builder.ToTable("teacher_ratings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.SchoolId).HasColumnType("char(36)");
        builder.Property(x => x.StudentId).HasColumnType("char(36)");
        builder.Property(x => x.TeacherId).HasColumnType("char(36)");
        builder.Property(x => x.GradeId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedBy).HasColumnType("char(36)");
        builder.Property(x => x.UpdatedBy).HasColumnType("char(36)");
        builder.Property(x => x.DeletedBy).HasColumnType("char(36)");

        builder.Property(x => x.Rating).IsRequired();
        builder.Property(x => x.Comment).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).IsRequired();

        // One rating per Student+Teacher pair — re-rating upserts this row.
        builder.HasIndex(x => new { x.StudentId, x.TeacherId }).IsUnique();
        builder.HasIndex(x => x.TeacherId);
        builder.HasIndex(x => x.GradeId);

        // FKs are convention-detected (StudentId/TeacherId/SchoolId/GradeId scalars
        // match the Student/Teacher/School/Grade nav names) — same pattern Certificate
        // relies on with no configuration class at all. No .Ignore() needed.
        builder.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.School).WithMany().HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Grade).WithMany().HasForeignKey(x => x.GradeId).OnDelete(DeleteBehavior.Restrict);
    }
}
