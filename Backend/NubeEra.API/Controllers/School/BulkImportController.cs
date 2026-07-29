using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Constants;

namespace NubeEra.API.Controllers.School
{
    [ApiController]
    [Route("api/bulk-import")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public class BulkImportController : ControllerBase
    {
        private readonly IBulkImportService _importService;

        public BulkImportController(IBulkImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("students")]
        public async Task<IActionResult> ImportStudents([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportStudentsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("attendance")]
        public async Task<IActionResult> ImportAttendance([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportAttendanceAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("teacher-schedule")]
        public async Task<IActionResult> ImportTeacherSchedule([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportTeacherScheduleAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("mcqs")]
        public async Task<IActionResult> ImportMcqs([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportMcqsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }
    }
}
