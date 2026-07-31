using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class CertificateConfiguration : IEntityTypeConfiguration<Certificate>
{
    public void Configure(EntityTypeBuilder<Certificate> builder)
    {
        builder.ToTable("certificates");
        builder.HasKey(x => x.Id);
        // All char(36) Guid columns must use ascii_general_ci to match referenced PKs
        builder.Property(x => x.Id)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.Property(x => x.CertificateNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.CertificateNumber).IsUnique();

        builder.Property(x => x.QrCodeData).HasMaxLength(500);
        builder.Property(x => x.StudentId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.TemplateId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.SchoolId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.IssuedByUserId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.ApprovedByUserId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");

        builder.Property(x => x.StudentName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.StudentIdNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.GradeName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.GradeLevel).IsRequired();
        builder.Property(x => x.SchoolName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ParentName).HasMaxLength(200);

        builder.Property(x => x.ProgramType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.CourseName).IsRequired().HasMaxLength(300);
        builder.Property(x => x.AcademicYear).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Percentage).HasPrecision(5, 2);
        builder.Property(x => x.PerformanceLevel).HasMaxLength(50);
        builder.Property(x => x.Remarks).HasMaxLength(500);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Draft");
        builder.Property(x => x.IsApproved).HasDefaultValue(false);
        builder.Property(x => x.IsRevoked).HasDefaultValue(false);
        builder.Property(x => x.RevokeReason).HasMaxLength(500);
        builder.Property(x => x.IsAvailableToStudent).HasDefaultValue(false);
        builder.Property(x => x.DownloadCount).HasDefaultValue(0);

        builder.Property(x => x.PrincipalName).HasMaxLength(200);
        builder.Property(x => x.PrincipalDesignation).HasMaxLength(100);
        builder.Property(x => x.DirectorName).HasMaxLength(200);
        builder.Property(x => x.DirectorDesignation).HasMaxLength(100);
        builder.Property(x => x.StaffName).HasMaxLength(200);
        builder.Property(x => x.StaffDesignation).HasMaxLength(100);
        // Ignore the base UpdatedBy GUID (not stored for certificates) to avoid missing column errors
        builder.Ignore(x => x.UpdatedBy);
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(36);

        builder.HasOne(x => x.Student)
            .WithMany()
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.School)
            .WithMany()
            .HasForeignKey(x => x.SchoolId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Template)
            .WithMany(t => t.Certificates)
            .HasForeignKey(x => x.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
