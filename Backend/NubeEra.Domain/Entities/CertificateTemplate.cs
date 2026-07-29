using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Configurable certificate template — one per program type / grade band.
/// </summary>
public class CertificateTemplate : BaseEntity
{
    public string Name { get; set; } = null!;                // "STEM Achiever — Junior"
    public string ProgramType { get; set; } = null!;         // "STEM"|"Robotics"|"AI"|etc.
    public string GradeBand { get; set; } = null!;           // "1-3"|"4-6"|"7-8"|"9-10"
    public string? Description { get; set; }

    // ── Branding & Title ───────────────────────────────────────────────────
    public string CertificateTitle { get; set; } = "CERTIFICATE OF ACHIEVEMENT";
    public string? Tagline { get; set; }

    // ── Signature Block Defaults ────────────────────────────────────────────
    public string? DefaultPrincipalName { get; set; }
    public string? DefaultDirectorName { get; set; }
    public string? DefaultStaffName { get; set; }
    public string? DefaultStaffDesignation { get; set; }

    // ── Lifecycle ──────────────────────────────────────────────────────────
    public bool IsActive { get; set; } = true;
    public Guid? SchoolId { get; set; }   // null = global template

    // ── Navigation ────────────────────────────────────────────────────────
    public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
}
