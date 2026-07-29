using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class BackupAuditLogConfiguration : IEntityTypeConfiguration<BackupAuditLog>
{
    public void Configure(EntityTypeBuilder<BackupAuditLog> builder)
    {
        builder.ToTable("backup_audit_logs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.UserId).HasColumnType("char(36)");
        builder.Property(x => x.UserName).IsRequired().HasMaxLength(255);
        builder.Property(x => x.Role).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ActionType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.IpAddress).IsRequired().HasMaxLength(64);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Details).HasColumnType("text");

        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.ActionType);
        builder.HasIndex(x => x.DateTime);
    }
}
