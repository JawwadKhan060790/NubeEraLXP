using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class TeacherSchedulePeriodConfiguration : IEntityTypeConfiguration<TeacherSchedulePeriod>
{
    public void Configure(EntityTypeBuilder<TeacherSchedulePeriod> builder)
    {
        builder.ToTable("TeacherSchedulePeriods");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status)
               .HasConversion<string>()
               .HasMaxLength(20)
               .IsRequired();

        builder.Property(x => x.Remarks).HasMaxLength(1000);
        builder.Property(x => x.PeriodDate).IsRequired();

        // One period-status row per scheduler entry per day
        builder.HasIndex(x => new { x.SchedulerId, x.PeriodDate }).IsUnique();
        builder.HasIndex(x => new { x.TeacherId, x.PeriodDate });
        builder.HasIndex(x => new { x.SchoolId, x.TeacherId });

        builder.HasOne(x => x.School)
               .WithMany()
               .HasForeignKey(x => x.SchoolId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Scheduler)
               .WithMany()
               .HasForeignKey(x => x.SchedulerId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Teacher)
               .WithMany()
               .HasForeignKey(x => x.TeacherId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Grade)
               .WithMany()
               .HasForeignKey(x => x.GradeId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
