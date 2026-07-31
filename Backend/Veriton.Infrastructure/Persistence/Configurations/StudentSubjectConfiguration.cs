using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class StudentSubjectConfiguration : IEntityTypeConfiguration<StudentSubject>
{
    public void Configure(EntityTypeBuilder<StudentSubject> builder)
    {
        builder.ToTable("student_subjects");
        builder.HasKey(x => new { x.StudentId, x.SubjectId });

        builder.Property(x => x.StudentId).HasColumnType("char(36)");
        builder.Property(x => x.SubjectId).HasColumnType("char(36)");

        builder.HasOne(x => x.Student)
            .WithMany(x => x.StudentSubjects)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Subject)
            .WithMany(x => x.StudentSubjects)
            .HasForeignKey(x => x.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
