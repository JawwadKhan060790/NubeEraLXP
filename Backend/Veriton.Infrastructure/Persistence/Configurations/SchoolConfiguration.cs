using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class SchoolConfiguration : IEntityTypeConfiguration<School>
{
    public void Configure(EntityTypeBuilder<School> builder)
    {
        builder.ToTable("schools");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        
        builder.Property(x => x.SchoolCode).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.SchoolCode).IsUnique();
        
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Address).HasMaxLength(500);
        builder.Property(x => x.ContactEmail).HasMaxLength(150);
        builder.Property(x => x.ContactPhone).HasMaxLength(20);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.Latitude).HasColumnType("decimal(9,6)");
        builder.Property(x => x.Longitude).HasColumnType("decimal(9,6)");
        builder.Property(x => x.CreatedAt).IsRequired();

        // Standardized grade-range configuration (FromGrade/ToGrade) — references the
        // system-defined GradeLevel master (1st-10th). Nullable at the DB level so that
        // existing schools can be migrated, but enforced as required at activation time
        // by SchoolCreateDto/SchoolUpdateDto validation + GenericSchoolService.
        builder.Property(x => x.FromGradeId).HasColumnType("char(36)").HasColumnName("from_grade_id");
        builder.Property(x => x.ToGradeId).HasColumnType("char(36)").HasColumnName("to_grade_id");

        builder.HasOne(x => x.FromGrade)
            .WithMany(g => g.SchoolsWithFromGrade)
            .HasForeignKey(x => x.FromGradeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ToGrade)
            .WithMany(g => g.SchoolsWithToGrade)
            .HasForeignKey(x => x.ToGradeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}