using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class GradeLevelConfiguration : IEntityTypeConfiguration<GradeLevel>
{
    public void Configure(EntityTypeBuilder<GradeLevel> builder)
    {
        builder.ToTable("grade_levels");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");

        builder.Property(x => x.LevelNumber).IsRequired();
        builder.Property(x => x.Name).IsRequired().HasMaxLength(50);
        builder.Property(x => x.DisplayOrder).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasIndex(x => x.LevelNumber).IsUnique();

        builder.HasMany(x => x.SchoolsWithFromGrade)
            .WithOne(s => s.FromGrade)
            .HasForeignKey(s => s.FromGradeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.SchoolsWithToGrade)
            .WithOne(s => s.ToGrade)
            .HasForeignKey(s => s.ToGradeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed the standardized grade master data (system-defined, immutable).
        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var seedRows = new List<GradeLevel>
        {
            new GradeLevel { Id = GradeLevelSeedIds[11], LevelNumber = -1, Name = "Boot Camp", DisplayOrder = 1, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[10], LevelNumber = 0, Name = "Foundation Course", DisplayOrder = 2, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[0], LevelNumber = 1, Name = "Grade I", DisplayOrder = 3, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[1], LevelNumber = 2, Name = "Grade II", DisplayOrder = 4, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[2], LevelNumber = 3, Name = "Grade III", DisplayOrder = 5, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[3], LevelNumber = 4, Name = "Grade IV", DisplayOrder = 6, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[4], LevelNumber = 5, Name = "Grade V", DisplayOrder = 7, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[5], LevelNumber = 6, Name = "Grade VI", DisplayOrder = 8, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[6], LevelNumber = 7, Name = "Grade VII", DisplayOrder = 9, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[7], LevelNumber = 8, Name = "Grade VIII", DisplayOrder = 10, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[8], LevelNumber = 9, Name = "Grade IX", DisplayOrder = 11, IsActive = true, CreatedAt = seedDate },
            new GradeLevel { Id = GradeLevelSeedIds[9], LevelNumber = 10, Name = "Grade X", DisplayOrder = 12, IsActive = true, CreatedAt = seedDate }
        };
        builder.HasData(seedRows);
    }

    /// <summary>
    /// Deterministic, fixed GUIDs for the 12 system-defined grade levels so that the
    /// seed is stable across migrations/environments (Id = 00000000-0000-0000-0000-00000000000{n}).
    /// </summary>
    public static readonly Guid[] GradeLevelSeedIds =
    {
        Guid.Parse("00000000-0000-0000-0000-000000000001"),
        Guid.Parse("00000000-0000-0000-0000-000000000002"),
        Guid.Parse("00000000-0000-0000-0000-000000000003"),
        Guid.Parse("00000000-0000-0000-0000-000000000004"),
        Guid.Parse("00000000-0000-0000-0000-000000000005"),
        Guid.Parse("00000000-0000-0000-0000-000000000006"),
        Guid.Parse("00000000-0000-0000-0000-000000000007"),
        Guid.Parse("00000000-0000-0000-0000-000000000008"),
        Guid.Parse("00000000-0000-0000-0000-000000000009"),
        Guid.Parse("00000000-0000-0000-0000-000000000010"),
        Guid.Parse("00000000-0000-0000-0000-000000000011"),
        Guid.Parse("00000000-0000-0000-0000-000000000012"),
    };
}
