using System;

namespace NubeEra.Application.DTOs;

public class ConvertRegistrationDto
{
    public Guid GradeId { get; set; }
    public string StudentId { get; set; } = null!;
    public string? RollNo { get; set; }
    public string Password { get; set; } = null!;
    public string? ParentPassword { get; set; }
}
