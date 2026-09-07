using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

public class AttendanceService : IAttendanceService
{
    private readonly IGenericRepository<Attendance> _repository;
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<Teacher> _teacherRepo;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public AttendanceService(
        IGenericRepository<Attendance> repository,
        IGenericRepository<Student> studentRepo,
        IGenericRepository<Teacher> teacherRepo,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _repository = repository;
        _studentRepo = studentRepo;
        _teacherRepo = teacherRepo;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    public async Task<TeacherAttendanceReportDto> GetTeacherMonthlyReportAsync(Guid teacherId, int month, int year)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var attendances = await _repository.GetAllAsync(q => 
            q.Where(a => a.TeacherId == teacherId && a.Date >= startDate && a.Date <= endDate));

        var report = new TeacherAttendanceReportDto
        {
            Month = startDate.ToString("MMMM yyyy"),
            PresentDays = attendances.Count(a => a.Status == AttendanceStatus.Present),
            AbsentDays = attendances.Count(a => a.Status == AttendanceStatus.Absent),
            LateDays = attendances.Count(a => a.Status == AttendanceStatus.Late),
            Records = attendances.OrderBy(a => a.Date).Select(a => new AttendanceRecordDto
            {
                Date = a.Date,
                Status = a.Status.ToString(),
                Remarks = a.Remarks
            }).ToList()
        };

        return report;
    }

    public async Task<List<AttendanceDto>> GetStudentAttendanceAsync(Guid gradeId, DateTime date, Guid? sectionId = null)
    {
        // Centralized grade-access gate: blocks IDOR attempts where a caller manipulates
        // the gradeId query parameter to pull attendance for (a) a grade outside their
        // school's configured standardized range, or (b) another school's grade entirely.
        // -> throws GradeAccessForbiddenException (HTTP 403). Single source of truth —
        // no bespoke per-module authorization checks.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(gradeId);

        var students = await _studentRepo.GetAllAsync(q => q.Where(s => s.GradeId == gradeId && s.IsActive && (sectionId == null || s.SectionId == sectionId)));

        var studentIds = students.Select(s => s.Id).ToHashSet();
        var targetDate = date.Date;
        var attendances = await _repository.GetAllAsync(q =>
            q.Where(a => a.StudentId != null && a.Date == targetDate && studentIds.Contains(a.StudentId!.Value)));

        return students.Select(s => {
            var att = attendances.FirstOrDefault(a => a.StudentId == s.Id);
            return new AttendanceDto
            {
                Id = att?.Id ?? Guid.Empty,
                Date = date,
                Status = att?.Status.ToString() ?? "Absent", // Default to Absent or empty
                Remarks = att?.Remarks,
                StudentId = s.Id,
                StudentName = $"{s.FirstName} {s.LastName}",
                Gender = s.Gender
            };
        }).ToList();
    }

    public async Task<List<AttendanceDto>> GetTeacherAttendanceAsync(DateTime date, Guid? schoolId = null)
    {
        var teachers = await _teacherRepo.GetAllAsync(q => 
            q.Where(t => t.IsActive && (schoolId == null || t.SchoolId == schoolId)));
        
        var targetDate = date.Date;
        var attendances = await _repository.GetAllAsync(q => 
            q.Where(a => a.TeacherId != null && a.StudentId == null && a.Date == targetDate && (schoolId == null || a.SchoolId == schoolId)));

        return teachers.Select(t => {
            var att = attendances.FirstOrDefault(a => a.TeacherId == t.Id);
            return new AttendanceDto
            {
                Id = att?.Id ?? Guid.Empty,
                Date = date,
                Status = att?.Status.ToString() ?? "Present", // Default to Present
                Remarks = att?.Remarks,
                TeacherId = t.Id,
                TeacherName = $"{t.FirstName} {t.LastName}",
                Gender = t.Gender
            };
        }).ToList();
    }

    public async Task SaveAttendanceAsync(List<AttendanceDto> dtos)
    {
        if (dtos == null || dtos.Count == 0) return;

        var callerSchoolId = _tenantService.GetEffectiveSchoolId();

        // Pre-validate every row before writing anything, so a single bad record
        // doesn't cause a partially-saved batch and so clients get a clear 400
        // instead of an opaque 500 from a failed Enum.Parse.
        var parsedStatuses = new Dictionary<AttendanceDto, AttendanceStatus>();
        foreach (var dto in dtos)
        {
            if (!Enum.TryParse<AttendanceStatus>(dto.Status, ignoreCase: true, out var status))
            {
                throw new AppException($"Invalid attendance status \"{dto.Status}\". Allowed values: {string.Join(", ", Enum.GetNames<AttendanceStatus>())}.");
            }
            parsedStatuses[dto] = status;
        }        // Authorization: confirm every student/teacher referenced belongs to the
        // caller's school (or is unassigned/global) so attendance can't be written for other schools (IDOR).
        List<Student> students = new();
        List<Teacher> teachers = new();

        var studentIds = dtos.Where(d => d.StudentId.HasValue).Select(d => d.StudentId!.Value).Distinct().ToList();
        if (studentIds.Count > 0)
        {
            students = await _studentRepo.GetAllAsync(q => q.IgnoreQueryFilters().Where(s => studentIds.Contains(s.Id) && !s.IsDeleted));
            if (students.Count != studentIds.Count)
            {
                throw new UnauthorizedAccessException("One or more student records could not be found.");
            } 
        }

        var teacherIds = dtos.Where(d => d.TeacherId.HasValue && !d.StudentId.HasValue).Select(d => d.TeacherId!.Value).Distinct().ToList();
        if (teacherIds.Count > 0)
        {
            teachers = await _teacherRepo.GetAllAsync(q => q.IgnoreQueryFilters().Where(t => teacherIds.Contains(t.Id) && !t.IsDeleted));
            if (teachers.Count != teacherIds.Count)
            {
                throw new UnauthorizedAccessException("One or more teacher records could not be found.");
            }

            if (callerSchoolId.HasValue)
            {
                if (teachers.Any(t => t.SchoolId != Guid.Empty && t.SchoolId != callerSchoolId.Value))
                {
                    throw new UnauthorizedAccessException("You are not authorized to record attendance for teachers outside your school.");
                }
            }
        }

        foreach (var dto in dtos)
        {
            var status = parsedStatuses[dto];
            if (dto.Id == Guid.Empty)
            {
                var schoolId = callerSchoolId;
                if (!schoolId.HasValue || schoolId == Guid.Empty)
                {
                    if (dto.StudentId.HasValue)
                    {
                        var student = students.FirstOrDefault(s => s.Id == dto.StudentId.Value) ?? await _studentRepo.GetByIdAsync(dto.StudentId.Value);
                        if (student != null && student.SchoolId != Guid.Empty) schoolId = student.SchoolId;
                    }
                    else if (dto.TeacherId.HasValue && !dto.StudentId.HasValue)
                    {
                        var teacher = teachers.FirstOrDefault(t => t.Id == dto.TeacherId.Value) ?? await _teacherRepo.GetByIdAsync(dto.TeacherId.Value);
                        if (teacher != null && teacher.SchoolId != Guid.Empty) schoolId = teacher.SchoolId;
                    }
                }

                var attendance = new Attendance
                {
                    SchoolId = (schoolId.HasValue && schoolId.Value != Guid.Empty) ? schoolId.Value : (callerSchoolId ?? Guid.Empty),
                    Date = dto.Date.Date,
                    Status = status,
                    Remarks = dto.Remarks,
                    TeacherId = dto.StudentId.HasValue ? null : dto.TeacherId,
                    StudentId = dto.StudentId
                };
                await _repository.AddAsync(attendance);
            }
            else
            {
                var attendance = await _repository.GetByIdAsync(dto.Id);
                if (attendance != null)
                {
                    if (callerSchoolId.HasValue && attendance.SchoolId != Guid.Empty && attendance.SchoolId != callerSchoolId.Value)
                    {
                        throw new UnauthorizedAccessException("You are not authorized to modify attendance records outside your school.");
                    }
                    attendance.Status = status;
                    attendance.Remarks = dto.Remarks;
                    await _repository.UpdateAsync(attendance);
                }
            }
        }
    }

    public async Task<TeacherAttendanceReportDto> GetMyAttendanceAsync(Guid studentId, int month, int year)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate   = startDate.AddMonths(1).AddDays(-1);

        var attendances = await _repository.GetAllAsync(q =>
            q.Where(a => a.StudentId == studentId && a.Date >= startDate && a.Date <= endDate));

        return new TeacherAttendanceReportDto
        {
            Month       = startDate.ToString("MMMM yyyy"),
            PresentDays = attendances.Count(a => a.Status == AttendanceStatus.Present),
            AbsentDays  = attendances.Count(a => a.Status == AttendanceStatus.Absent),
            LateDays    = attendances.Count(a => a.Status == AttendanceStatus.Late),
            Records     = attendances.OrderBy(a => a.Date).Select(a => new AttendanceRecordDto
            {
                Date    = a.Date,
                Status  = a.Status.ToString(),
                Remarks = a.Remarks
            }).ToList()
        };
    }
}
