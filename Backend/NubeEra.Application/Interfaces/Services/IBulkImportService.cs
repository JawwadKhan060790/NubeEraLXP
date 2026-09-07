using System.IO;
using System.Threading.Tasks;
using System;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services
{
    public interface IBulkImportService
    {
        Task<ImportResultDto> ImportStudentsAsync(Guid schoolId, Stream excelStream);
        Task<ImportResultDto> ImportAttendanceAsync(Guid schoolId, Stream excelStream);
        Task<ImportResultDto> ImportTeacherScheduleAsync(Guid schoolId, Stream excelStream);
        Task<ImportResultDto> ImportMcqsAsync(Guid schoolId, Stream excelStream);
        Task<ImportResultDto> ImportUnitsAsync(Guid schoolId, Stream excelStream);
        Task<ImportResultDto> ImportTopicsAsync(Guid schoolId, Stream excelStream);
    }
}
