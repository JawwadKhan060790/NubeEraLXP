using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Common;

namespace Veriton.API.Controllers.School;

/// <summary>
/// Canonical, application-wide source for the standardized 1st-10th Grade master list
/// and each user's school-scoped subset of it. Every grade dropdown / filter / search /
/// registration form / report filter in the application MUST source its options from
/// this endpoint (via the shared frontend GradeSelect component) rather than hardcoding
/// a grade list — guaranteeing a single, centrally-governed grade visibility mechanism.
/// </summary>
[ApiController]
[Route("api/grade-levels")]
[Authorize]
public class GradeLevelsController : ControllerBase
{
    private readonly IGradeAccessService _gradeAccessService;

    public GradeLevelsController(IGradeAccessService gradeAccessService)
    {
        _gradeAccessService = gradeAccessService;
    }

    /// <summary>
    /// Returns the grade levels visible to the CURRENT authenticated user — i.e. the
    /// standardized 1st-10th Grade list filtered down to their school's configured
    /// FromGrade-ToGrade range. This is what every dropdown/filter in the app should call.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> GetAllowedForCurrentUser()
        => Ok(await _gradeAccessService.GetAllowedGradeLevelsForCurrentUserAsync());

    /// <summary>
    /// Returns the grades allowed for a SPECIFIC school. Used by Academic Setup /
    /// School management screens (Admin/Staff/Principal selecting/viewing a school's
    /// configuration) — never exposes another school's data to school-scoped roles
    /// beyond what their own access already permits.
    /// </summary>
    [HttpGet("by-school/{schoolId}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> GetAllowedForSchool(Guid schoolId)
        => Ok(await _gradeAccessService.GetAllowedGradeLevelsAsync(schoolId));

    /// <summary>
    /// Returns the full standardized 1st-10th Grade master list, unfiltered. Used by
    /// platform-level Academic Setup screens (e.g. School create/edit "From Grade"/"To
    /// Grade" pickers) where the full master must be presented regardless of any
    /// individual school's currently configured range. Also used by the Units/Topics
    /// create-edit forms (/staff/modules, /staff/lessons), since Units/Topics are
    /// school-agnostic master content that may be written at ANY of the 10 grade
    /// levels — so this is opened to Teachers and above (not just Principal+) here.
    /// </summary>
    [HttpGet("master")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetMasterList()
        => Ok(await _gradeAccessService.GetAllGradeLevelsAsync());
}
