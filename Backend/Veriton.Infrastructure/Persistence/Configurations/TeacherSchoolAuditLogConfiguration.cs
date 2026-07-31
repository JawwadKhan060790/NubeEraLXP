using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class TeacherSchoolAuditLogConfiguration : IEntityTypeConfiguration<TeacherSchoolAuditLog>
{
    public void Configure(EntityTypeBuilder<TeacherSchoolAuditLog> builder)
    {
        builder.ToTable("teacher_school_audit_logs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.TeacherName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.SchoolName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ActionPerformed).IsRequired().HasMaxLength(30);
        builder.Property(x => x.UserName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Role).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Notes).HasMaxLength(500);
        builder.Property(x => x.PerformedBy).IsRequired();
        builder.Property(x => x.DateTime).IsRequired();

        builder.HasIndex(x => x.TeacherId);
        builder.HasIndex(x => x.SchoolId);
        builder.HasIndex(x => x.DateTime);

        builder.HasOne(x => x.Teacher).WithMany()
            .HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict).IsRequired();
        builder.HasOne(x => x.School).WithMany()
            .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired();
    }
}
