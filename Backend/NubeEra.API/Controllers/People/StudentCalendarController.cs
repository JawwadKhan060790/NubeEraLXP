using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.People;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentCalendarController : ControllerBase
{
    private readonly IStudentCalendarService _calendarService;
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IUserRepository _userRepo;
    private readonly ICurrentUserService _currentUserService;

    public StudentCalendarController(
        IStudentCalendarService calendarService,
        IGenericRepository<Student> studentRepo,
        IUserRepository userRepo,
        ICurrentUserService currentUserService)
    {
        _calendarService = calendarService;
        _studentRepo = studentRepo;
        _userRepo = userRepo;
        _currentUserService = currentUserService;
    }

    [HttpGet("{studentId:guid}/calendar")]
    public async Task<IActionResult> GetStudentCalendar(
        Guid studentId,
        [FromQuery] DateTime? start = null,
        [FromQuery] DateTime? end = null)
    {
        try
        {
            if (!await IsAuthorizedToViewCalendarAsync(studentId))
            {
                return Forbid();
            }

            var startVal = start ?? DateTime.UtcNow.Date.AddDays(-30);
            var endVal = end ?? DateTime.UtcNow.Date.AddDays(30);

            var calendar = await _calendarService.GetStudentCalendarAsync(studentId, startVal, endVal);
            return Ok(calendar);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching the calendar.", error = ex.Message });
        }
    }

    private async Task<bool> IsAuthorizedToViewCalendarAsync(Guid studentId)
    {
        var role = _currentUserService.Role;
        var userIdStr = _currentUserService.UserId;

        if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
            return false;

        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Staff", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Teacher", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Principal", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var userGuid = Guid.Parse(userIdStr);

        if (role.Equals("Student", StringComparison.OrdinalIgnoreCase))
        {
            var student = await _studentRepo.GetByIdAsync(studentId)
                ?? (await _studentRepo.GetAllAsync(q => q.Where(s => s.UserId == studentId))).FirstOrDefault();
            return student != null && (student.UserId == userGuid || student.Id == userGuid);
        }

        if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
        {
            var parentUser = await _userRepo.GetByIdAsync(userGuid);
            if (parentUser == null || string.IsNullOrEmpty(parentUser.Phone))
                return false;

            var student = await _studentRepo.GetByIdAsync(studentId);
            if (student == null || string.IsNullOrEmpty(student.ParentGuardianPhone))
                return false;

            var normalizedParentPhone = NormalizePhoneForMatching(parentUser.Phone);
            var normalizedStudentParentPhone = NormalizePhoneForMatching(student.ParentGuardianPhone);

            return PhonesLikelyMatch(normalizedParentPhone, normalizedStudentParentPhone);
        }

        return false;
    }

    private static string NormalizePhoneForMatching(string phone)
    {
        var cleaned = new string(phone.Where(char.IsDigit).ToArray());
        return cleaned;
    }

    private static bool PhonesLikelyMatch(string p1, string p2)
    {
        if (p1 == p2) return true;
        var minLen = Math.Min(p1.Length, p2.Length);
        if (minLen < 7) return false;
        var checkLen = Math.Min(minLen, 10);
        var end1 = p1.Substring(p1.Length - checkLen);
        var end2 = p2.Substring(p2.Length - checkLen);
        return end1 == end2;
    }
}
