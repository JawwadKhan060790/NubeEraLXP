using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Constants;

namespace Veriton.API.Controllers.Academic;

/// <summary>
/// Lets a Student rate/give feedback on their teachers from the Student Dashboard.
/// </summary>
[ApiController]
[Route("api/teacher-ratings")]
[Authorize]
public class TeacherRatingsController : ControllerBase
{
    private readonly ITeacherRatingService _service;
    private readonly ICurrentUserService _currentUserService;

    public TeacherRatingsController(ITeacherRatingService service, ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    /// <summary>Teachers the logged-in Student can rate, with their existing rating (if any).</summary>
    [HttpGet("my-teachers")]
    [Authorize(Policy = AppPolicies.StudentOnly)]
    public async Task<IActionResult> GetMyTeachers()
    {
        var studentId = _currentUserService.StudentId;
        if (!studentId.HasValue)
            return BadRequest(new { message = "Student profile not found." });

        try
        {
            var teachers = await _service.GetRatableTeachersAsync(studentId.Value);
            return Ok(teachers);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Submit (or update) a rating for one of the Student's teachers.</summary>
    [HttpPost]
    [Authorize(Policy = AppPolicies.StudentOnly)]
    public async Task<IActionResult> SubmitRating([FromBody] SubmitTeacherRatingDto dto)
    {
        var studentId = _currentUserService.StudentId;
        if (!studentId.HasValue)
            return BadRequest(new { message = "Student profile not found." });

        try
        {
            var result = await _service.SubmitRatingAsync(studentId.Value, dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
