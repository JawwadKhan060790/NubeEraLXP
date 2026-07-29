using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class GradeSectionConfiguration : IEntityTypeConfiguration<GradeSection>
{
    public void Configure(EntityTypeBuilder<GradeSection> builder)
    {
        builder.ToTable("GradeSections");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SectionCode)
               .HasMaxLength(10)
               .IsRequired();

        builder.Property(x => x.SectionName).HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(500);

        // One section code per grade per school (e.g., Grade1-A is unique per school)
        builder.HasIndex(x => new { x.SchoolId, x.GradeId, x.SectionCode }).IsUnique();
        builder.HasIndex(x => new { x.SchoolId, x.GradeId });
        builder.HasIndex(x => x.GradeId);

        builder.HasOne(x => x.School)
               .WithMany()
               .HasForeignKey(x => x.SchoolId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Grade)
               .WithMany()
               .HasForeignKey(x => x.GradeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Students)
               .WithOne(s => s.Section)
               .HasForeignKey(s => s.SectionId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.Schedulers)
               .WithOne(s => s.Section)
               .HasForeignKey(s => s.SectionId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
