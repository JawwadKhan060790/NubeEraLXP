using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Persistence.Configurations;

public class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.QuestionText).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.OptionA).IsRequired().HasMaxLength(500);
        builder.Property(x => x.OptionB).IsRequired().HasMaxLength(500);
        builder.Property(x => x.OptionC).IsRequired().HasMaxLength(500);
        builder.Property(x => x.OptionD).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CorrectAnswer).IsRequired().HasMaxLength(1);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasOne(x => x.Exam).WithMany(x => x.Questions).HasForeignKey(x => x.ExamId).OnDelete(DeleteBehavior.Cascade);

        // Performance indexes for paginated list queries
        builder.HasIndex(x => new { x.SchoolId, x.IsActive }).HasDatabaseName("IX_questions_school_active");
        builder.HasIndex(x => x.ExamId).HasDatabaseName("IX_questions_exam");
        builder.HasIndex(x => x.ModuleId).HasDatabaseName("IX_questions_module");
    }
}
