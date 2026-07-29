using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class SchoolUnitAssignmentConfiguration : IEntityTypeConfiguration<SchoolUnitAssignment>
{
    public void Configure(EntityTypeBuilder<SchoolUnitAssignment> builder)
    {
        builder.ToTable("school_unit_assignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.AssignedBy).IsRequired();
        builder.Property(x => x.AssignedDate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(500);

        // Exactly one row, ever, per (School, Unit) pair — unassign = soft delete of
        // THIS row; re-assign = restore THIS row. No filtered index needed (MySQL
        // doesn't support partial indexes) because the service layer always restores
        // rather than re-inserts. See SchoolUnitAssignment doc comment.
        builder.HasIndex(x => new { x.SchoolId, x.UnitId }).IsUnique();
        builder.HasIndex(x => x.SchoolId);
        builder.HasIndex(x => x.UnitId);

        builder.HasOne(x => x.School).WithMany(s => s.SchoolUnitAssignments)
            .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired();
        builder.HasOne(x => x.Unit).WithMany(u => u.SchoolAssignments)
            .HasForeignKey(x => x.UnitId).OnDelete(DeleteBehavior.Restrict).IsRequired();
    }
}
