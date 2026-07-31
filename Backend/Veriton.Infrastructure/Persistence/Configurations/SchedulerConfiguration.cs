using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class SchedulerConfiguration : IEntityTypeConfiguration<Scheduler>
{
    public void Configure(EntityTypeBuilder<Scheduler> builder)
    {
        builder.ToTable("schedulers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.Date).IsRequired();
        builder.Property(x => x.StartTime).IsRequired();
        builder.Property(x => x.EndTime).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.Grade).WithMany(x => x.Schedules).HasForeignKey(x => x.GradeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Module).WithMany(x => x.Schedules).HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Lesson).WithMany(x => x.Schedules).HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.Teacher).WithMany(x => x.Schedules).HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.GradeId, x.Date, x.StartTime });
    }
}
