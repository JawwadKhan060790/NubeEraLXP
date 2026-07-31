namespace Veriton.Seeder.Core;

/// <summary>
/// Shared state container – holds all generated IDs so seeders can
/// reference entities created by earlier seeders without round-trips.
/// </summary>
public sealed class SeedContext
{
    // ── Foundation ────────────────────────────────────────────────────────
    /// <summary>RoleName → RoleId</summary>
    public Dictionary<string, string> Roles { get; } = new();

    /// <summary>LevelNumber (1-10) → GradeLevelId</summary>
    public Dictionary<int, string> GradeLevels { get; } = new();

    /// <summary>SchoolNumber (1-500) → SchoolId</summary>
    public Dictionary<int, string> Schools { get; } = new();

    // ── Users ─────────────────────────────────────────────────────────────
    /// <summary>SchoolNumber → PrincipalUserId</summary>
    public Dictionary<int, string> PrincipalUserIds { get; } = new();

    /// <summary>TeacherNumber (1-200) → (UserId, TeacherId, SchoolId)</summary>
    public Dictionary<int, (string UserId, string TeacherId, string SchoolId)> TeacherIds { get; } = new();

    /// <summary>StudentNumber (1-5000) → (UserId, StudentId, SchoolId, GradeId)</summary>
    public Dictionary<int, (string UserId, string StudentId, string SchoolId, string GradeId, string Email)> StudentIds { get; } = new();

    /// <summary>ParentNumber (1-5000) → UserId  (linked to student of same number)</summary>
    public Dictionary<int, string> ParentUserIds { get; } = new();

    // ── Academic ─────────────────────────────────────────────────────────
    /// <summary>Key = $"{schoolNum}-{gradeLevel}" e.g. "1-5" → GradeId</summary>
    public Dictionary<string, string> GradeIds { get; } = new();

    /// <summary>
    /// GradeLevel (1-10) → (ModuleId, GradeLevelId).
    /// Units are now school-agnostic master content keyed only by grade level —
    /// one Unit per grade level, shared across every school. Per-school visibility
    /// is granted separately via school_unit_assignments (see SchoolCurriculumAssignmentService
    /// / the /admin/curriculum-assignment page).
    /// </summary>
    public Dictionary<int, (string ModuleId, string GradeLevelId)> ModuleIds { get; } = new();

    /// <summary>GradeLevel (1-10) → list of TopicIds (Lesson.Id) under that level's Unit(s)</summary>
    public Dictionary<int, List<string>> LessonIdsByLevel { get; } = new();

    /// <summary>Total lessons inserted (topics + activities)</summary>
    public int LessonCount { get; set; }

    // ── Operational ───────────────────────────────────────────────────────
    /// <summary>Exam IDs created (for MCQ questions)</summary>
    public List<(string ExamId, string SchoolId, string GradeId, string ModuleId)> ExamIds { get; } = new();

    // ── Helper methods ────────────────────────────────────────────────────
    public string SchoolId(int num) => Schools[num];
    public string RoleId(string name) => Roles[name];
    public string GradeId(int schoolNum, int level) => GradeIds[$"{schoolNum}-{level}"];

    /// <summary>Pre-baked BCrypt hash for password "123456" (workFactor=4 for seeding speed)</summary>
    public string PasswordHash123456 { get; set; } = string.Empty;
}
