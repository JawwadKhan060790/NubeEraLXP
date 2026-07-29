using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class SchoolTopicAssignmentConfiguration : IEntityTypeConfiguration<SchoolTopicAssignment>
{
    public void Configure(EntityTypeBuilder<SchoolTopicAssignment> builder)
    {
        builder.ToTable("school_topic_assignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.AssignedBy).IsRequired();
        builder.Property(x => x.AssignedDate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(500);

        builder.HasIndex(x => new { x.SchoolId, x.TopicId }).IsUnique();
        builder.HasIndex(x => x.SchoolId);
        builder.HasIndex(x => x.TopicId);

        builder.HasOne(x => x.School).WithMany(s => s.SchoolTopicAssignments)
            .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict).IsRequired();
        builder.HasOne(x => x.Topic).WithMany(t => t.SchoolAssignments)
            .HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict).IsRequired();
    }
}
