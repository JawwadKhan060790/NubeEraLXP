using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class CurriculumAssignmentAuditLogConfiguration : IEntityTypeConfiguration<CurriculumAssignmentAuditLog>
{
    public void Configure(EntityTypeBuilder<CurriculumAssignmentAuditLog> builder)
    {
        builder.ToTable("curriculum_assignment_audit_logs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.EntityType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.EntityName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ActionPerformed).IsRequired().HasMaxLength(30);
        builder.Property(x => x.UserName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Role).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Notes).HasMaxLength(500);
        builder.Property(x => x.PerformedBy).IsRequired();
        builder.Property(x => x.DateTime).IsRequired();

        builder.HasIndex(x => x.SchoolId);
        builder.HasIndex(x => new { x.EntityType, x.EntityId });
        builder.HasIndex(x => x.DateTime);

        // History rows must survive even if the School is later hard-deleted via the
        // Recycle Bin, so this is intentionally Restrict (blocks hard delete while
        // history exists) rather than Cascade (which would erase the audit trail).
        builder.HasOne(x => x.School).WithMany()
            .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired();
    }
}
