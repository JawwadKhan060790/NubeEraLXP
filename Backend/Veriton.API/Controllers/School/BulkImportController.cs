using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Constants;

namespace Veriton.API.Controllers.School
{
    [ApiController]
    [Route("api/bulk-import")]
    [Authorize]
    public class BulkImportController : ControllerBase
    {
        private readonly IBulkImportService _importService;

        public BulkImportController(IBulkImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("students")]
        [Authorize(Policy = AppPolicies.StaffOnly)]
        public async Task<IActionResult> ImportStudents([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportStudentsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("attendance")]
        [Authorize(Policy = AppPolicies.StaffOnly)]
        public async Task<IActionResult> ImportAttendance([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportAttendanceAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("teacher-schedule")]
        [Authorize(Policy = AppPolicies.StaffOnly)]
        public async Task<IActionResult> ImportTeacherSchedule([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportTeacherScheduleAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("mcqs")]
        [Authorize(Policy = AppPolicies.TeacherOnly)]
        public async Task<IActionResult> ImportMcqs([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportMcqsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("units")]
        [Authorize(Policy = AppPolicies.StaffOnly)]
        public async Task<IActionResult> ImportUnits([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportUnitsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }

        [HttpPost("topics")]
        [Authorize(Policy = AppPolicies.StaffOnly)]
        public async Task<IActionResult> ImportTopics([FromForm] Guid schoolId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { success = false, errors = new[] { "No file uploaded" } });
            var result = await _importService.ImportTopicsAsync(schoolId, file.OpenReadStream());
            return Ok(result);
        }
    }
}
