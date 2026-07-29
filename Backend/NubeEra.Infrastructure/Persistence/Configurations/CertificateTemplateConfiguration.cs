using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class CertificateTemplateConfiguration : IEntityTypeConfiguration<CertificateTemplate>
{
    public void Configure(EntityTypeBuilder<CertificateTemplate> builder)
    {
        builder.ToTable("certificate_templates");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ProgramType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.GradeBand).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.CertificateTitle).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Tagline).HasMaxLength(300);
        builder.Property(x => x.DefaultPrincipalName).HasMaxLength(200);
        builder.Property(x => x.DefaultDirectorName).HasMaxLength(200);
        builder.Property(x => x.DefaultStaffName).HasMaxLength(200);
        builder.Property(x => x.DefaultStaffDesignation).HasMaxLength(100);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SchoolId)
            .HasColumnType("char(36)").UseCollation("ascii_general_ci");
    }
}
