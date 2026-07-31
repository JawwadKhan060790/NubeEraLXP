using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class User : BaseEntity
{
    public Guid? SchoolId { get; set; }
    public Guid RoleId { get; set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }

    // Navigation Properties
    public School? School { get; set; }
    public Role Role { get; set; } = null!;
    public Teacher? TeacherProfile { get; set; }
    public Student? StudentProfile { get; set; }

    private User() { }

    public User(string email, string passwordHash, Guid roleId, Guid? schoolId = null)
    {
        Id = Guid.NewGuid();
        Email = email;
        PasswordHash = passwordHash;
        RoleId = roleId;
        SchoolId = schoolId;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdatePassword(string newPasswordHash)
    {
        PasswordHash = newPasswordHash;
    }

    public void UpdateEmail(string newEmail)
    {
        Email = newEmail;
    }

    public void UpdateLastLogin()
    {
        LastLoginAt = DateTime.UtcNow;
    }

    public void SetRole(Guid roleId)
    {
        RoleId = roleId;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
}
