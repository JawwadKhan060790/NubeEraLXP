using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ExamConfiguration : IEntityTypeConfiguration<Exam>
{
    public void Configure(EntityTypeBuilder<Exam> builder)
    {
        builder.ToTable("exams");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.Date).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(300);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.Grade).WithMany(x => x.Exams).HasForeignKey(x => x.GradeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Module).WithMany(x => x.Exams).HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.CreatedByTeacher).WithMany(x => x.Exams).HasForeignKey(x => x.CreatedByTeacherId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);

        builder.HasIndex(x => new { x.GradeId, x.ModuleId, x.Date });
    }
}
