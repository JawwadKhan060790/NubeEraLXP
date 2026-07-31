using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ReportCardSkillConfiguration : IEntityTypeConfiguration<ReportCardSkill>
{
    public void Configure(EntityTypeBuilder<ReportCardSkill> builder)
    {
        builder.ToTable("report_card_skills");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ReportCardId).HasColumnType("char(36)");
        builder.Property(x => x.SkillName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Rating).IsRequired();
        builder.Property(x => x.Remarks).HasMaxLength(500);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).IsRequired();
    }
}
