namespace NubeEra.Application.DTOs;

public class TeacherBaseDto
{
    public Guid? SchoolId { get; set; }

    /// <summary>
    /// Requirement 2 (Multi-School Teacher Assignment): the full set of Schools to
    /// select on the Create/Edit screen's multi-select. Null/omitted preserves the
    /// pre-multi-school behavior (single home school only). When provided, <see cref="SchoolId"/>
    /// is treated as the desired primary school and is added to this list automatically
    /// if missing — the service never removes a School that is simply absent from this
    /// list (use the dedicated unassign endpoint for that).
    /// </summary>
    public List<Guid>? SchoolIds { get; set; }
    public string EmployeeId { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Username { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public DateTime? JoiningDate { get; set; }
    public string? Qualification { get; set; }
    public string? Specialization { get; set; }
    public decimal? Salary { get; set; }
}

public class TeacherCreateDto : TeacherBaseDto
{
    public string? Password { get; set; }
}

public class TeacherUpdateDto : TeacherBaseDto
{
    public bool IsActive { get; set; }
}

public class TeacherDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid SchoolId { get; set; }
    public string SchoolName { get; set; } = null!;
    public string EmployeeId { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Username { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? Qualification { get; set; }
    public string? Specialization { get; set; }
    public string? BloodGroup { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? JoiningDate { get; set; }
    public decimal? Salary { get; set; }
    public bool IsActive { get; set; }

    /// <summary>
    /// Every (active + inactive, non-deleted) School this Teacher belongs to —
    /// backs the Create/Edit screen's multi-select and the read-only School column
    /// on the Teacher list. See ITeacherSchoolService.
    /// </summary>
    public List<TeacherAvailableSchoolDto> Schools { get; set; } = new();
}