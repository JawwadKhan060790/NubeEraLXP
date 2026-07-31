using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Persistence.Configurations;

public class TeacherConfiguration : IEntityTypeConfiguration<Teacher>
{
    public void Configure(EntityTypeBuilder<Teacher> builder)
    {
        builder.ToTable("teachers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        
        builder.Property(x => x.EmployeeId).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => new { x.SchoolId, x.EmployeeId }).IsUnique();
        
        builder.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.LastName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Email).IsRequired().HasMaxLength(150);
        builder.HasIndex(x => x.Email);
        
        builder.Property(x => x.Phone).HasMaxLength(20);
        builder.Property(x => x.Gender).HasMaxLength(10);
        builder.Property(x => x.Qualification).HasMaxLength(200);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        
        builder.HasOne(x => x.School).WithMany(x => x.Teachers).HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.User).WithOne(x => x.TeacherProfile).HasForeignKey<Teacher>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}