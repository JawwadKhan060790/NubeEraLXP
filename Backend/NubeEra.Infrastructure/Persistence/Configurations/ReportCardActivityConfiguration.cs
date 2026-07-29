using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class ReportCardActivityConfiguration : IEntityTypeConfiguration<ReportCardActivity>
{
    public void Configure(EntityTypeBuilder<ReportCardActivity> builder)
    {
        builder.ToTable("report_card_activities");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ReportCardId).HasColumnType("char(36)");
        builder.Property(x => x.ActivityName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Rating).HasMaxLength(50);
        builder.Property(x => x.Remarks).HasMaxLength(500);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).IsRequired();
    }
}
