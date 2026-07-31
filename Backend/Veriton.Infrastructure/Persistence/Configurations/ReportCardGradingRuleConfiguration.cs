using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ReportCardGradingRuleConfiguration : IEntityTypeConfiguration<ReportCardGradingRule>
{
    public void Configure(EntityTypeBuilder<ReportCardGradingRule> builder)
    {
        builder.ToTable("report_card_grading_rules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.SchoolId).HasColumnType("char(36)");
        builder.Property(x => x.MinPercentage).HasPrecision(5, 2);
        builder.Property(x => x.MaxPercentage).HasPrecision(5, 2);
        builder.Property(x => x.GradeLetter).IsRequired().HasMaxLength(10);
        builder.Property(x => x.GpaValue).HasPrecision(4, 2);
        builder.Property(x => x.Description).HasMaxLength(100);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasOne(x => x.School)
            .WithMany()
            .HasForeignKey(x => x.SchoolId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
