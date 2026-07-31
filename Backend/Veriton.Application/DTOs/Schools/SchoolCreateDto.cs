namespace Veriton.Application.DTOs;

public class SchoolCreateDto
{
    public string SchoolCode { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? PrincipalName { get; set; }
    public string? PrincipalEmail { get; set; }
    public string? PrincipalPhone { get; set; }
    public string? PrincipalPassword { get; set; }

    /// <summary>
    /// Lower bound (inclusive) of the standardized grade range this school supports.
    /// Must be a value 1-10 referencing the system-defined Grade master (1st-10th Grade).
    /// Example: FromGrade = 6, ToGrade = 10 => school supports Grades 6,7,8,9,10 only.
    /// </summary>
    public int? FromGrade { get; set; }

    /// <summary>Upper bound (inclusive) of the standardized grade range this school supports. 1-10.</summary>
    public int? ToGrade { get; set; }

    // ── Geolocation ────────────────────────────────────────────────────────
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class SchoolUpdateDto : SchoolCreateDto
{
    public bool IsActive { get; set; }
}

public class SchoolDto
{
    public Guid Id { get; set; }
    public string SchoolCode { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Address { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrincipalName { get; set; }
    public string? PrincipalEmail { get; set; }
    public string? PrincipalPhone { get; set; }
    public bool IsActive { get; set; }

    /// <summary>Numeric lower bound (1-10) of this school's configured grade range.</summary>
    public int? FromGrade { get; set; }
    /// <summary>Numeric upper bound (1-10) of this school's configured grade range.</summary>
    public int? ToGrade { get; set; }
    /// <summary>Display name of the lower-bound grade, e.g. "6th Grade".</summary>
    public string? FromGradeName { get; set; }
    /// <summary>Display name of the upper-bound grade, e.g. "10th Grade".</summary>
    public string? ToGradeName { get; set; }
    /// <summary>True when both FromGrade and ToGrade are configured and valid (From &lt;= To, both within 1-10).
    /// A school cannot be activated while this is false.</summary>
    public bool HasValidGradeRange { get; set; }

    // ── Geolocation ────────────────────────────────────────────────────────
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
