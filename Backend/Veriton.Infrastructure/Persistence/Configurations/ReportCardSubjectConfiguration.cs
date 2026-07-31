using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class ReportCardSubjectConfiguration : IEntityTypeConfiguration<ReportCardSubject>
{
    public void Configure(EntityTypeBuilder<ReportCardSubject> builder)
    {
        builder.ToTable("report_card_subjects");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ReportCardId).HasColumnType("char(36)");
        builder.Property(x => x.SubjectName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.MaxMarks).IsRequired();
        builder.Property(x => x.ObtainedMarks).HasPrecision(8, 2);
        builder.Property(x => x.Grade).HasMaxLength(10);
        builder.Property(x => x.Remarks).HasMaxLength(500);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).IsRequired();
    }
}
