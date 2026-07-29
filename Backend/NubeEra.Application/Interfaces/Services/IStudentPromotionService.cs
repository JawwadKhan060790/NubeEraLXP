using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Minimal, single-student promotion/transfer operation — see
/// StudentPromotionRequestDto for the scope note explaining why this is
/// deliberately narrower than the full bulk/audited feature documented as a
/// gap in the QA report ("Student promotion / grade transfer").
/// </summary>
public interface IStudentPromotionService
{
    /// <summary>
    /// Validates the target grade (and school, if provided) belong to the same
    /// tenant context as the caller, moves the student, sends an in-app
    /// notification to the student's linked account (if any), and writes an
    /// audit-log line. Throws AppException for validation failures and
    /// UnauthorizedAccessException for cross-school violations.
    /// </summary>
    Task PromoteOrTransferAsync(Guid studentId, StudentPromotionRequestDto dto);
}
