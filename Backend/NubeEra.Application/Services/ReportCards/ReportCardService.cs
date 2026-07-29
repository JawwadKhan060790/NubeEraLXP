using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services.ReportCards;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services.ReportCards;

public class ReportCardService : IReportCardService
{
    private readonly IGenericRepository<ReportCard> _rcRepo;
    private readonly IGenericRepository<ReportCardSubject> _subjectRepo;
    private readonly IGenericRepository<ReportCardActivity> _activityRepo;
    private readonly IGenericRepository<ReportCardSkill> _skillRepo;
    private readonly IGenericRepository<ReportCardGradingRule> _ruleRepo;
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<School> _schoolRepo;
    private readonly IGenericRepository<Grade> _gradeRepo;
    private readonly IGenericRepository<User> _userRepo;
    private readonly ICurrentUserService _currentUser;

    public ReportCardService(
        IGenericRepository<ReportCard> rcRepo,
        IGenericRepository<ReportCardSubject> subjectRepo,
        IGenericRepository<ReportCardActivity> activityRepo,
        IGenericRepository<ReportCardSkill> skillRepo,
        IGenericRepository<ReportCardGradingRule> ruleRepo,
        IGenericRepository<Student> studentRepo,
        IGenericRepository<School> schoolRepo,
        IGenericRepository<Grade> gradeRepo,
        IGenericRepository<User> userRepo,
        ICurrentUserService currentUser)
    {
        _rcRepo = rcRepo;
        _subjectRepo = subjectRepo;
        _activityRepo = activityRepo;
        _skillRepo = skillRepo;
        _ruleRepo = ruleRepo;
        _studentRepo = studentRepo;
        _schoolRepo = schoolRepo;
        _gradeRepo = gradeRepo;
        _userRepo = userRepo;
        _currentUser = currentUser;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid CurrentUserId()
    {
        if (!Guid.TryParse(_currentUser.UserId, out var id))
            throw new UnauthorizedAccessException("Not authenticated.");
        return id;
    }

    private static string NextRcNumber(int seq) =>
        $"RC-{DateTime.UtcNow:yyyy}-{seq:D6}";

    private static decimal CalcPercentage(decimal obtained, decimal total) =>
        total == 0 ? 0 : Math.Round(obtained / total * 100, 2);

    private async Task<string> AssignGradeLetterAsync(decimal percentage, Guid? schoolId)
    {
        // Prefer school-specific rules; fall back to system defaults (SchoolId == null)
        var rules = await _ruleRepo.GetAllAsync(q =>
            q.Where(r => r.IsActive && (r.SchoolId == schoolId || r.SchoolId == null))
             .OrderByDescending(r => r.SchoolId.HasValue)  // school-specific first
             .ThenBy(r => r.MinPercentage));

        var match = rules.FirstOrDefault(r => percentage >= r.MinPercentage && percentage <= r.MaxPercentage);
        return match?.GradeLetter ?? (percentage >= 50 ? "C" : "F");
    }

    private async Task<decimal?> AssignGpaAsync(decimal percentage, Guid? schoolId)
    {
        var rules = await _ruleRepo.GetAllAsync(q =>
            q.Where(r => r.IsActive && (r.SchoolId == schoolId || r.SchoolId == null))
             .OrderByDescending(r => r.SchoolId.HasValue));
        var match = rules.FirstOrDefault(r => percentage >= r.MinPercentage && percentage <= r.MaxPercentage);
        return match?.GpaValue;
    }

    private static ReportCardDto ToDto(ReportCard rc) => new()
    {
        Id = rc.Id.ToString(),
        ReportCardNumber = rc.ReportCardNumber,
        SchoolId = rc.SchoolId.ToString(),
        StudentId = rc.StudentId.ToString(),
        GradeId = rc.GradeId.ToString(),
        AcademicYear = rc.AcademicYear,
        ExamType = rc.ExamType,
        ExamName = rc.ExamName,
        ExamDate = rc.ExamDate,
        StudentName = rc.StudentName,
        StudentIdNumber = rc.StudentIdNumber,
        RollNo = rc.RollNo,
        GradeName = rc.GradeName,
        Section = rc.Section,
        SchoolName = rc.SchoolName,
        SchoolAddress = rc.SchoolAddress,
        SchoolLogoUrl = rc.SchoolLogoUrl,
        SchoolContact = rc.SchoolContact,
        DateOfBirth = rc.DateOfBirth,
        ParentName = rc.ParentName,
        ParentContact = rc.ParentContact,
        TotalMarks = rc.TotalMarks,
        ObtainedMarks = rc.ObtainedMarks,
        Percentage = rc.Percentage,
        OverallGrade = rc.OverallGrade,
        GPA = rc.GPA,
        Rank = rc.Rank,
        IsPassed = rc.IsPassed,
        TotalWorkingDays = rc.TotalWorkingDays,
        DaysPresent = rc.DaysPresent,
        DaysAbsent = rc.DaysAbsent,
        AttendancePercentage = rc.AttendancePercentage,
        TeacherRemarks = rc.TeacherRemarks,
        PrincipalRemarks = rc.PrincipalRemarks,
        Status = rc.Status,
        IsVisibleToStudent = rc.IsVisibleToStudent,
        IsVisibleToParent = rc.IsVisibleToParent,
        ApprovedAt = rc.ApprovedAt,
        PublishedAt = rc.PublishedAt,
        QrCodeData = rc.QrCodeData,
        DownloadCount = rc.DownloadCount,
        CreatedAt = rc.CreatedAt,
        UpdatedAt = rc.UpdatedAt,
        Subjects = rc.Subjects.OrderBy(s => s.SortOrder).Select(s => new ReportCardSubjectDto
        {
            Id = s.Id.ToString(),
            SubjectName = s.SubjectName,
            MaxMarks = s.MaxMarks,
            ObtainedMarks = s.ObtainedMarks,
            Grade = s.Grade,
            Remarks = s.Remarks,
            SortOrder = s.SortOrder,
        }).ToList(),
        Activities = rc.Activities.OrderBy(a => a.SortOrder).Select(a => new ReportCardActivityDto
        {
            ActivityName = a.ActivityName,
            Rating = a.Rating,
            Remarks = a.Remarks,
            SortOrder = a.SortOrder,
        }).ToList(),
        Skills = rc.Skills.OrderBy(sk => sk.SortOrder).Select(sk => new ReportCardSkillDto
        {
            SkillName = sk.SkillName,
            Rating = sk.Rating,
            Remarks = sk.Remarks,
            SortOrder = sk.SortOrder,
        }).ToList(),
    };

    private static ReportCardListItemDto ToListItem(ReportCard rc) => new()
    {
        Id = rc.Id.ToString(),
        ReportCardNumber = rc.ReportCardNumber,
        StudentName = rc.StudentName,
        StudentIdNumber = rc.StudentIdNumber,
        RollNo = rc.RollNo,
        GradeName = rc.GradeName,
        Section = rc.Section,
        SchoolName = rc.SchoolName,
        AcademicYear = rc.AcademicYear,
        ExamType = rc.ExamType,
        ExamName = rc.ExamName,
        Percentage = rc.Percentage,
        OverallGrade = rc.OverallGrade,
        IsPassed = rc.IsPassed,
        Status = rc.Status,
        IsVisibleToStudent = rc.IsVisibleToStudent,
        IsVisibleToParent = rc.IsVisibleToParent,
        PublishedAt = rc.PublishedAt,
        DownloadCount = rc.DownloadCount,
        CreatedAt = rc.CreatedAt,
    };

    // ── Generate ──────────────────────────────────────────────────────────────

    public async Task<ReportCardDto> GenerateAsync(GenerateReportCardDto dto)
    {
        var schoolId = Guid.Parse(dto.SchoolId);
        var studentId = Guid.Parse(dto.StudentId);
        var gradeId = Guid.Parse(dto.GradeId);
        var userId = CurrentUserId();

        var student = await _studentRepo.GetByIdAsync(studentId)
            ?? throw new AppException("Student not found.");
        var school = await _schoolRepo.GetByIdAsync(schoolId)
            ?? throw new AppException("School not found.");
        var grade = await _gradeRepo.GetByIdAsync(gradeId)
            ?? throw new AppException("Grade not found.");

        // Sequence number
        var count = await _rcRepo.CountAsync();
        var rcNumber = NextRcNumber(count + 1);

        // Calculate performance
        var totalMarks = dto.Subjects.Sum(s => (decimal)s.MaxMarks);
        var obtainedMarks = dto.Subjects.Sum(s => s.ObtainedMarks);
        var pct = CalcPercentage(obtainedMarks, totalMarks);
        var gradeLetter = await AssignGradeLetterAsync(pct, schoolId);
        var gpa = await AssignGpaAsync(pct, schoolId);
        var isPassed = pct >= 50;

        // Attendance
        decimal? attPct = null;
        if (dto.TotalWorkingDays > 0 && dto.DaysPresent.HasValue)
            attPct = Math.Round((decimal)dto.DaysPresent.Value / dto.TotalWorkingDays!.Value * 100, 2);

        var rc = new ReportCard
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            StudentId = studentId,
            GradeId = gradeId,
            ReportCardNumber = rcNumber,
            AcademicYear = dto.AcademicYear,
            ExamType = dto.ExamType,
            ExamName = dto.ExamName,
            ExamDate = dto.ExamDate,
            Section = dto.Section,
            StudentName = $"{student.FirstName} {student.LastName}".Trim(),
            StudentIdNumber = student.StudentId,
            RollNo = student.RollNo,
            GradeName = grade.GradeName,
            SchoolName = school.Name,
            SchoolAddress = school.Address,
            SchoolLogoUrl = school.LogoUrl,
            SchoolContact = school.ContactPhone ?? school.ContactEmail,
            DateOfBirth = student.DateOfBirth,
            ParentName = student.ParentGuardianName,
            ParentContact = student.ParentGuardianPhone,
            TotalMarks = totalMarks,
            ObtainedMarks = obtainedMarks,
            Percentage = pct,
            OverallGrade = gradeLetter,
            GPA = gpa,
            IsPassed = isPassed,
            TotalWorkingDays = dto.TotalWorkingDays,
            DaysPresent = dto.DaysPresent,
            DaysAbsent = dto.DaysAbsent,
            AttendancePercentage = attPct,
            TeacherRemarks = dto.TeacherRemarks,
            PrincipalRemarks = dto.PrincipalRemarks,
            Status = "Draft",
            IsVisibleToStudent = false,
            IsVisibleToParent = false,
            GeneratedByUserId = userId,
            QrCodeData = null,
            CreatedAt = DateTime.UtcNow,
        };

        await _rcRepo.AddAsync(rc);

        // Add subjects
        var subjectEntities = dto.Subjects.Select((s, i) => new ReportCardSubject
        {
            Id = Guid.NewGuid(),
            ReportCardId = rc.Id,
            SubjectName = s.SubjectName,
            MaxMarks = s.MaxMarks,
            ObtainedMarks = s.ObtainedMarks,
            Grade = AssignSubjectGrade(s.ObtainedMarks, s.MaxMarks),
            Remarks = s.Remarks,
            SortOrder = s.SortOrder > 0 ? s.SortOrder : i,
            CreatedAt = DateTime.UtcNow,
        }).ToList();
        foreach (var sub in subjectEntities) await _subjectRepo.AddAsync(sub);

        // Add activities
        var activityEntities = dto.Activities.Select((a, i) => new ReportCardActivity
        {
            Id = Guid.NewGuid(),
            ReportCardId = rc.Id,
            ActivityName = a.ActivityName,
            Rating = a.Rating,
            Remarks = a.Remarks,
            SortOrder = a.SortOrder > 0 ? a.SortOrder : i,
            CreatedAt = DateTime.UtcNow,
        }).ToList();
        foreach (var act in activityEntities) await _activityRepo.AddAsync(act);

        // Add skills
        var skillEntities = dto.Skills.Select((sk, i) => new ReportCardSkill
        {
            Id = Guid.NewGuid(),
            ReportCardId = rc.Id,
            SkillName = sk.SkillName,
            Rating = sk.Rating,
            Remarks = sk.Remarks,
            SortOrder = sk.SortOrder > 0 ? sk.SortOrder : i,
            CreatedAt = DateTime.UtcNow,
        }).ToList();
        foreach (var skill in skillEntities) await _skillRepo.AddAsync(skill);

        // QR code URL (frontend verification route)
        rc.QrCodeData = $"/report-cards/verify/{rc.ReportCardNumber}";
        await _rcRepo.UpdateAsync(rc);

        rc.Subjects = subjectEntities;
        rc.Activities = activityEntities;
        rc.Skills = skillEntities;

        return ToDto(rc);
    }

    private static string AssignSubjectGrade(decimal obtained, int max)
    {
        if (max == 0) return "N/A";
        var pct = obtained / max * 100;
        return pct switch
        {
            >= 90 => "A+",
            >= 80 => "A",
            >= 70 => "B+",
            >= 60 => "B",
            >= 50 => "C",
            _ => "F"
        };
    }

    public async Task<BulkGenerateResultDto> BulkGenerateAsync(BulkGenerateReportCardDto dto)
    {
        var result = new BulkGenerateResultDto();
        foreach (var s in dto.Students)
        {
            try
            {
                var single = new GenerateReportCardDto
                {
                    SchoolId = dto.SchoolId,
                    StudentId = s.StudentId,
                    GradeId = dto.GradeId,
                    AcademicYear = dto.AcademicYear,
                    ExamType = dto.ExamType,
                    ExamName = dto.ExamName,
                    ExamDate = dto.ExamDate,
                    Section = dto.Section,
                    TotalWorkingDays = s.TotalWorkingDays,
                    DaysPresent = s.DaysPresent,
                    DaysAbsent = s.DaysAbsent,
                    TeacherRemarks = s.TeacherRemarks ?? dto.TeacherRemarks,
                    PrincipalRemarks = dto.PrincipalRemarks,
                    Subjects = s.Subjects,
                    Activities = s.Activities,
                    Skills = s.Skills,
                };
                await GenerateAsync(single);
                result.Generated++;
            }
            catch (Exception ex)
            {
                result.Skipped++;
                result.Errors.Add($"Student {s.StudentId}: {ex.Message}");
            }
        }
        return result;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    private IQueryable<ReportCard> WithIncludes() =>
        _rcRepo.Query()
               .Include(r => r.Subjects)
               .Include(r => r.Activities)
               .Include(r => r.Skills);

    public async Task<ReportCardDto> GetByIdAsync(Guid id)
    {
        var rc = await WithIncludes().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("Report card not found.");
        return ToDto(rc);
    }

    public async Task<List<ReportCardListItemDto>> GetAllAsync(
        Guid? schoolId, string? status, string? academicYear, string? examType, string? search)
    {
        var query = _rcRepo.Query().AsNoTracking();
        if (schoolId.HasValue) query = query.Where(r => r.SchoolId == schoolId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(academicYear)) query = query.Where(r => r.AcademicYear == academicYear);
        if (!string.IsNullOrWhiteSpace(examType)) query = query.Where(r => r.ExamType == examType);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(r =>
                r.StudentName.ToLower().Contains(lower) ||
                r.StudentIdNumber.ToLower().Contains(lower) ||
                r.ReportCardNumber.ToLower().Contains(lower));
        }
        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return list.Select(ToListItem).ToList();
    }

    public async Task<List<ReportCardListItemDto>> GetByStudentAsync(Guid studentId)
    {
        var list = await _rcRepo.GetAllAsync(q =>
            q.Where(r => r.StudentId == studentId && r.IsVisibleToStudent)
             .OrderByDescending(r => r.CreatedAt));
        return list.Select(ToListItem).ToList();
    }

    public async Task<List<ReportCardListItemDto>> GetForParentAsync(Guid parentUserId)
    {
        // Find student(s) linked to this parent user via ParentGuardianEmail or userId
        var user = await _userRepo.GetByIdAsync(parentUserId);
        var students = await _studentRepo.GetAllAsync(q =>
            q.Where(s => s.UserId == parentUserId ||
                         (user != null && s.ParentGuardianEmail == user.Email)));

        var studentIds = students.Select(s => s.Id).ToList();
        if (!studentIds.Any()) return new List<ReportCardListItemDto>();

        var list = await _rcRepo.GetAllAsync(q =>
            q.Where(r => studentIds.Contains(r.StudentId) && r.IsVisibleToParent)
             .OrderByDescending(r => r.CreatedAt));
        return list.Select(ToListItem).ToList();
    }

    public async Task<ReportCardDto> UpdateAsync(Guid id, UpdateReportCardDto dto)
    {
        var rc = await WithIncludes().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("Report card not found.");
        if (rc.Status == "Published")
            throw new AppException("Cannot edit a published report card. Unpublish first.");

        rc.ExamName = dto.ExamName ?? rc.ExamName;
        rc.ExamDate = dto.ExamDate ?? rc.ExamDate;
        rc.Section = dto.Section ?? rc.Section;
        rc.TotalWorkingDays = dto.TotalWorkingDays ?? rc.TotalWorkingDays;
        rc.DaysPresent = dto.DaysPresent ?? rc.DaysPresent;
        rc.DaysAbsent = dto.DaysAbsent ?? rc.DaysAbsent;
        rc.TeacherRemarks = dto.TeacherRemarks ?? rc.TeacherRemarks;
        rc.PrincipalRemarks = dto.PrincipalRemarks ?? rc.PrincipalRemarks;
        rc.UpdatedAt = DateTime.UtcNow;
        rc.UpdatedByUserId = _currentUser.UserId;

        if (dto.Subjects != null)
        {
            foreach (var s in rc.Subjects.ToList()) await _subjectRepo.DeleteAsync(s);
            foreach (var (s, i) in dto.Subjects.Select((s, i) => (s, i)))
                await _subjectRepo.AddAsync(new ReportCardSubject
                {
                    Id = Guid.NewGuid(), ReportCardId = rc.Id,
                    SubjectName = s.SubjectName, MaxMarks = s.MaxMarks,
                    ObtainedMarks = s.ObtainedMarks, Grade = AssignSubjectGrade(s.ObtainedMarks, s.MaxMarks),
                    Remarks = s.Remarks, SortOrder = s.SortOrder > 0 ? s.SortOrder : i,
                    CreatedAt = DateTime.UtcNow,
                });

            var total = dto.Subjects.Sum(s => (decimal)s.MaxMarks);
            var obtained = dto.Subjects.Sum(s => s.ObtainedMarks);
            var pct = CalcPercentage(obtained, total);
            rc.TotalMarks = total;
            rc.ObtainedMarks = obtained;
            rc.Percentage = pct;
            rc.OverallGrade = await AssignGradeLetterAsync(pct, rc.SchoolId);
            rc.GPA = await AssignGpaAsync(pct, rc.SchoolId);
            rc.IsPassed = pct >= 50;
        }

        if (dto.Activities != null)
        {
            foreach (var a in rc.Activities.ToList()) await _activityRepo.DeleteAsync(a);
            foreach (var (a, i) in dto.Activities.Select((a, i) => (a, i)))
                await _activityRepo.AddAsync(new ReportCardActivity
                {
                    Id = Guid.NewGuid(), ReportCardId = rc.Id,
                    ActivityName = a.ActivityName, Rating = a.Rating,
                    Remarks = a.Remarks, SortOrder = a.SortOrder > 0 ? a.SortOrder : i,
                    CreatedAt = DateTime.UtcNow,
                });
        }

        if (dto.Skills != null)
        {
            foreach (var sk in rc.Skills.ToList()) await _skillRepo.DeleteAsync(sk);
            foreach (var (sk, i) in dto.Skills.Select((sk, i) => (sk, i)))
                await _skillRepo.AddAsync(new ReportCardSkill
                {
                    Id = Guid.NewGuid(), ReportCardId = rc.Id,
                    SkillName = sk.SkillName, Rating = sk.Rating,
                    Remarks = sk.Remarks, SortOrder = sk.SortOrder > 0 ? sk.SortOrder : i,
                    CreatedAt = DateTime.UtcNow,
                });
        }

        if (rc.TotalWorkingDays > 0 && rc.DaysPresent.HasValue)
            rc.AttendancePercentage = Math.Round((decimal)rc.DaysPresent.Value / rc.TotalWorkingDays!.Value * 100, 2);

        await _rcRepo.UpdateAsync(rc);
        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var rc = await _rcRepo.GetByIdAsync(id) ?? throw new AppException("Report card not found.");
        if (rc.Status == "Published")
            throw new AppException("Cannot delete a published report card.");
        await _rcRepo.DeleteAsync(rc);
    }

    // ── Workflow ──────────────────────────────────────────────────────────────

    public async Task<ReportCardDto> PublishAsync(Guid id, PublishReportCardDto dto)
    {
        var rc = await WithIncludes().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("Report card not found.");

        rc.Status = "Published";
        rc.IsVisibleToStudent = dto.IsVisibleToStudent;
        rc.IsVisibleToParent = dto.IsVisibleToParent;
        rc.PublishedAt = DateTime.UtcNow;
        rc.PublishedByUserId = CurrentUserId();
        rc.UpdatedAt = DateTime.UtcNow;
        await _rcRepo.UpdateAsync(rc);
        return ToDto(rc);
    }

    public async Task<ReportCardDto> UnpublishAsync(Guid id)
    {
        var rc = await WithIncludes().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("Report card not found.");
        rc.Status = "Draft";
        rc.IsVisibleToStudent = false;
        rc.IsVisibleToParent = false;
        rc.UpdatedAt = DateTime.UtcNow;
        await _rcRepo.UpdateAsync(rc);
        return ToDto(rc);
    }

    public async Task<ReportCardDto> ArchiveAsync(Guid id)
    {
        var rc = await WithIncludes().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("Report card not found.");
        rc.Status = "Archived";
        rc.UpdatedAt = DateTime.UtcNow;
        await _rcRepo.UpdateAsync(rc);
        return ToDto(rc);
    }

    // ── Grading Rules ─────────────────────────────────────────────────────────

    public async Task<List<ReportCardGradingRuleDto>> GetGradingRulesAsync(Guid? schoolId)
    {
        var rules = await _ruleRepo.GetAllAsync(q =>
            q.Where(r => r.IsActive && (r.SchoolId == schoolId || r.SchoolId == null))
             .OrderBy(r => r.SortOrder).ThenBy(r => r.MinPercentage));
        return rules.Select(r => new ReportCardGradingRuleDto
        {
            Id = r.Id.ToString(), SchoolId = r.SchoolId?.ToString(),
            MinPercentage = r.MinPercentage, MaxPercentage = r.MaxPercentage,
            GradeLetter = r.GradeLetter, GpaValue = r.GpaValue,
            Description = r.Description, IsActive = r.IsActive, SortOrder = r.SortOrder,
        }).ToList();
    }

    public async Task<ReportCardGradingRuleDto> UpsertGradingRuleAsync(Guid? schoolId, Guid? ruleId, UpsertGradingRuleDto dto)
    {
        ReportCardGradingRule rule;
        if (ruleId.HasValue)
        {
            rule = await _ruleRepo.GetByIdAsync(ruleId.Value) ?? throw new AppException("Rule not found.");
        }
        else
        {
            rule = new ReportCardGradingRule { Id = Guid.NewGuid(), SchoolId = schoolId, CreatedAt = DateTime.UtcNow };
            await _ruleRepo.AddAsync(rule);
        }
        rule.MinPercentage = dto.MinPercentage;
        rule.MaxPercentage = dto.MaxPercentage;
        rule.GradeLetter = dto.GradeLetter;
        rule.GpaValue = dto.GpaValue;
        rule.Description = dto.Description;
        rule.SortOrder = dto.SortOrder;
        rule.IsActive = true;
        await _ruleRepo.UpdateAsync(rule);
        return new ReportCardGradingRuleDto
        {
            Id = rule.Id.ToString(), SchoolId = rule.SchoolId?.ToString(),
            MinPercentage = rule.MinPercentage, MaxPercentage = rule.MaxPercentage,
            GradeLetter = rule.GradeLetter, GpaValue = rule.GpaValue,
            Description = rule.Description, IsActive = rule.IsActive, SortOrder = rule.SortOrder,
        };
    }

    public async Task DeleteGradingRuleAsync(Guid id)
    {
        var rule = await _ruleRepo.GetByIdAsync(id) ?? throw new AppException("Rule not found.");
        await _ruleRepo.DeleteAsync(rule);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    public async Task IncrementDownloadCountAsync(Guid id)
    {
        var rc = await _rcRepo.GetByIdAsync(id) ?? throw new AppException("Report card not found.");
        rc.DownloadCount++;
        rc.LastDownloadedAt = DateTime.UtcNow;
        await _rcRepo.UpdateAsync(rc);
    }
}
