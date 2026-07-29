using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services.Certificates;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services.Certificates;

public class CertificateService : ICertificateService
{
    private readonly IGenericRepository<Certificate> _certRepo;
    private readonly IGenericRepository<CertificateTemplate> _templateRepo;
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<School> _schoolRepo;
    private readonly IGenericRepository<User> _userRepo;
    private readonly ICurrentUserService _currentUser;

    public CertificateService(
        IGenericRepository<Certificate> certRepo,
        IGenericRepository<CertificateTemplate> templateRepo,
        IGenericRepository<Student> studentRepo,
        IGenericRepository<School> schoolRepo,
        IGenericRepository<User> userRepo,
        ICurrentUserService currentUser)
    {
        _certRepo = certRepo;
        _templateRepo = templateRepo;
        _studentRepo = studentRepo;
        _schoolRepo = schoolRepo;
        _userRepo = userRepo;
        _currentUser = currentUser;
    }

    private Guid CurrentUserId()
    {
        var id = _currentUser.UserId;
        if (string.IsNullOrEmpty(id)) throw new UnauthorizedAccessException("Not authenticated.");
        return Guid.Parse(id);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static string NextCertNumber(int seq) =>
        $"CERT-{DateTime.UtcNow:yyyy}-{seq:D6}";

    private static string DeriveGradeBand(int level) => level switch
    {
        <= 3 => "1-3",
        <= 6 => "4-6",
        <= 8 => "7-8",
        _ => "9-10"
    };

    private static CertificateListItemDto ToListItem(Certificate c) => new()
    {
        Id = c.Id,
        CertificateNumber = c.CertificateNumber,
        StudentName = c.StudentName,
        StudentIdNumber = c.StudentIdNumber,
        GradeName = c.GradeName,
        SchoolName = c.SchoolName,
        ProgramType = c.ProgramType,
        CourseName = c.CourseName,
        AcademicYear = c.AcademicYear,
        Status = c.Status,
        IsApproved = c.IsApproved,
        IsAvailableToStudent = c.IsAvailableToStudent,
        IsRevoked = c.IsRevoked,
        Percentage = c.Percentage,
        PerformanceLevel = c.PerformanceLevel,
        CompletionDate = c.CompletionDate,
        CreatedAt = c.CreatedAt,
        DownloadCount = c.DownloadCount,
    };

    private static CertificateDto ToDto(Certificate c) => new()
    {
        Id = c.Id,
        CertificateNumber = c.CertificateNumber,
        QrCodeData = c.QrCodeData,
        StudentId = c.StudentId,
        StudentName = c.StudentName,
        StudentIdNumber = c.StudentIdNumber,
        GradeName = c.GradeName,
        GradeLevel = c.GradeLevel,
        SchoolName = c.SchoolName,
        ParentName = c.ParentName,
        ProgramType = c.ProgramType,
        CourseName = c.CourseName,
        AcademicYear = c.AcademicYear,
        CompletionDate = c.CompletionDate,
        Percentage = c.Percentage,
        PerformanceLevel = c.PerformanceLevel,
        Remarks = c.Remarks,
        Status = c.Status,
        IsApproved = c.IsApproved,
        ApprovedAt = c.ApprovedAt,
        IsRevoked = c.IsRevoked,
        IsAvailableToStudent = c.IsAvailableToStudent,
        IssuedAt = c.IssuedAt,
        ExpiryDate = c.ExpiryDate,
        DownloadCount = c.DownloadCount,
        LastDownloadedAt = c.LastDownloadedAt,
        PrincipalName = c.PrincipalName,
        PrincipalDesignation = c.PrincipalDesignation,
        DirectorName = c.DirectorName,
        DirectorDesignation = c.DirectorDesignation,
        StaffName = c.StaffName,
        StaffDesignation = c.StaffDesignation,
        TemplateId = c.TemplateId,
        TemplateName = c.Template?.Name,
        CertificateTitle = c.Template?.CertificateTitle,
        Tagline = c.Template?.Tagline,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt,
    };

    // ── Templates ──────────────────────────────────────────────────────────

    public async Task<List<CertificateTemplateDto>> GetTemplatesAsync(Guid? schoolId = null)
    {
        var list = await _templateRepo.GetAllAsync(q =>
        {
            q = q.Where(t => t.IsActive);
            if (schoolId.HasValue) q = q.Where(t => t.SchoolId == null || t.SchoolId == schoolId);
            return q.OrderBy(t => t.ProgramType).ThenBy(t => t.GradeBand);
        });
        return list.Select(t => new CertificateTemplateDto
        {
            Id = t.Id, Name = t.Name, ProgramType = t.ProgramType, GradeBand = t.GradeBand,
            Description = t.Description, CertificateTitle = t.CertificateTitle, Tagline = t.Tagline,
            DefaultPrincipalName = t.DefaultPrincipalName, DefaultDirectorName = t.DefaultDirectorName,
            DefaultStaffName = t.DefaultStaffName, DefaultStaffDesignation = t.DefaultStaffDesignation,
            IsActive = t.IsActive, SchoolId = t.SchoolId, CreatedAt = t.CreatedAt,
        }).ToList();
    }

    public async Task<CertificateTemplateDto> GetTemplateByIdAsync(Guid id)
    {
        var t = await _templateRepo.GetByIdAsync(id) ?? throw new AppException("Template not found.");
        return new CertificateTemplateDto
        {
            Id = t.Id, Name = t.Name, ProgramType = t.ProgramType, GradeBand = t.GradeBand,
            Description = t.Description, CertificateTitle = t.CertificateTitle, Tagline = t.Tagline,
            DefaultPrincipalName = t.DefaultPrincipalName, DefaultDirectorName = t.DefaultDirectorName,
            DefaultStaffName = t.DefaultStaffName, DefaultStaffDesignation = t.DefaultStaffDesignation,
            IsActive = t.IsActive, SchoolId = t.SchoolId, CreatedAt = t.CreatedAt,
        };
    }

    public async Task<CertificateTemplateDto> CreateTemplateAsync(CertificateTemplateCreateDto dto)
    {
        var t = new CertificateTemplate
        {
            Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow,
            Name = dto.Name, ProgramType = dto.ProgramType, GradeBand = dto.GradeBand,
            Description = dto.Description, CertificateTitle = dto.CertificateTitle, Tagline = dto.Tagline,
            DefaultPrincipalName = dto.DefaultPrincipalName, DefaultDirectorName = dto.DefaultDirectorName,
            DefaultStaffName = dto.DefaultStaffName, DefaultStaffDesignation = dto.DefaultStaffDesignation,
            IsActive = dto.IsActive, SchoolId = dto.SchoolId,
        };
        await _templateRepo.AddAsync(t);
        return await GetTemplateByIdAsync(t.Id);
    }

    public async Task<CertificateTemplateDto> UpdateTemplateAsync(Guid id, CertificateTemplateUpdateDto dto)
    {
        var t = await _templateRepo.GetByIdAsync(id) ?? throw new AppException("Template not found.");
        t.Name = dto.Name; t.ProgramType = dto.ProgramType; t.GradeBand = dto.GradeBand;
        t.Description = dto.Description; t.CertificateTitle = dto.CertificateTitle; t.Tagline = dto.Tagline;
        t.DefaultPrincipalName = dto.DefaultPrincipalName; t.DefaultDirectorName = dto.DefaultDirectorName;
        t.DefaultStaffName = dto.DefaultStaffName; t.DefaultStaffDesignation = dto.DefaultStaffDesignation;
        t.IsActive = dto.IsActive; t.SchoolId = dto.SchoolId;
        await _templateRepo.UpdateAsync(t);
        return await GetTemplateByIdAsync(t.Id);
    }

    public async Task DeleteTemplateAsync(Guid id)
    {
        var t = await _templateRepo.GetByIdAsync(id) ?? throw new AppException("Template not found.");
        t.IsActive = false;
        await _templateRepo.UpdateAsync(t);
    }

    // ── Certificates ────────────────────────────────────────────────────────

    public async Task<List<CertificateListItemDto>> GetAllCertificatesAsync(string? status, Guid? schoolId, string? search)
    {
        var list = await _certRepo.GetAllAsync(q =>
        {
            q = q.Include(c => c.Template);
            if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
            if (schoolId.HasValue) q = q.Where(c => c.SchoolId == schoolId);
            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                q = q.Where(c =>
                    c.StudentName.ToLower().Contains(s) ||
                    c.CertificateNumber.ToLower().Contains(s) ||
                    c.CourseName.ToLower().Contains(s));
            }
            return q.OrderByDescending(c => c.CreatedAt);
        });
        return list.Select(ToListItem).ToList();
    }

    public async Task<CertificateDto> GetCertificateByIdAsync(Guid id)
    {
        var certs = await _certRepo.GetAllAsync(q => q
            .Include(c => c.Template)
            .Where(c => c.Id == id));
        var cert = certs.FirstOrDefault() ?? throw new AppException("Certificate not found.");
        return ToDto(cert);
    }

    public async Task<CertificateDto> CreateCertificateAsync(CertificateCreateDto dto)
    {
        // Resolve student
        var students = await _studentRepo.GetAllAsync(q => q
            .Include(s => s.School)
            .Include(s => s.Grade)
            .Where(s => s.Id == dto.StudentId));
        var student = students.FirstOrDefault() ?? throw new AppException("Student not found.");

        // Resolve template
        CertificateTemplate? template = null;
        if (dto.TemplateId.HasValue)
            template = await _templateRepo.GetByIdAsync(dto.TemplateId.Value);

        // Auto-match template from program + grade band if none supplied
        if (template == null)
        {
            var band = DeriveGradeBand(int.TryParse(student.Grade?.GradeName, out var lvl) ? lvl : 1);
            var autoTemplates = await _templateRepo.GetAllAsync(q => q
                .Where(t => t.IsActive && t.ProgramType == dto.ProgramType && t.GradeBand == band));
            template = autoTemplates.FirstOrDefault();
            // Fall back to "all grades" templates
            if (template == null)
            {
                var anyTemplates = await _templateRepo.GetAllAsync(q => q
                    .Where(t => t.IsActive && t.ProgramType == dto.ProgramType && t.GradeBand == "1-10"));
                template = anyTemplates.FirstOrDefault();
            }
        }

        var count = await _certRepo.CountAsync() + 1;
        var certNumber = NextCertNumber(count);
        var gradeLevel = int.TryParse(student.Grade?.GradeName, out var gl) ? gl : 1;

        var cert = new Certificate
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            CertificateNumber = certNumber,
            QrCodeData = $"https://nubeera.tech/verify/{certNumber}",
            StudentId = dto.StudentId,
            TemplateId = template?.Id,
            SchoolId = student.SchoolId,
            IssuedByUserId = CurrentUserId(),
            StudentName = $"{student.FirstName} {student.LastName}".Trim(),
            StudentIdNumber = student.StudentId,
            GradeName = student.Grade?.GradeName ?? "N/A",
            GradeLevel = gradeLevel,
            SchoolName = student.School?.Name ?? "N/A",
            ParentName = student.ParentGuardianName,
            ProgramType = dto.ProgramType,
            CourseName = dto.CourseName,
            AcademicYear = dto.AcademicYear,
            CompletionDate = dto.CompletionDate,
            Percentage = dto.Percentage,
            PerformanceLevel = dto.PerformanceLevel,
            Remarks = dto.Remarks,
            Status = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal") ? "Issued" : "PendingApproval",
            IsApproved = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal"),
            ApprovedByUserId = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal") ? CurrentUserId() : null,
            ApprovedAt = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal") ? DateTime.UtcNow : null,
            IsAvailableToStudent = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal"),
            IssuedAt = (_currentUser.Role == "SuperAdmin" || _currentUser.Role == "Admin" || _currentUser.Role == "Principal" || _currentUser.Role == "admin" || _currentUser.Role == "principal") ? DateTime.UtcNow : null,
            PrincipalName = dto.PrincipalName ?? template?.DefaultPrincipalName,
            PrincipalDesignation = "Principal",
            DirectorName = dto.DirectorName ?? template?.DefaultDirectorName,
            DirectorDesignation = "Director",
            StaffName = dto.StaffName ?? template?.DefaultStaffName,
            StaffDesignation = dto.StaffDesignation ?? template?.DefaultStaffDesignation,
            ExpiryDate = dto.ExpiryDate,
        };

        await _certRepo.AddAsync(cert);
        return await GetCertificateByIdAsync(cert.Id);
    }

    public async Task<List<CertificateDto>> BulkCreateCertificatesAsync(BulkCertificateCreateDto dto)
    {
        var results = new List<CertificateDto>();
        foreach (var studentId in dto.StudentIds)
        {
            var singleDto = new CertificateCreateDto
            {
                StudentId = studentId,
                TemplateId = dto.TemplateId,
                ProgramType = dto.ProgramType,
                CourseName = dto.CourseName,
                AcademicYear = dto.AcademicYear,
                CompletionDate = dto.CompletionDate,
                PrincipalName = dto.PrincipalName,
                DirectorName = dto.DirectorName,
                StaffName = dto.StaffName,
                StaffDesignation = dto.StaffDesignation,
            };
            try { results.Add(await CreateCertificateAsync(singleDto)); }
            catch { /* skip failed student, continue bulk */ }
        }
        return results;
    }

    public async Task<CertificateDto> UpdateCertificateAsync(Guid id, CertificateUpdateDto dto)
    {
        var cert = await _certRepo.GetByIdAsync(id) ?? throw new AppException("Certificate not found.");
        if (cert.IsRevoked) throw new AppException("Cannot update a revoked certificate.");

        if (dto.CourseName != null) cert.CourseName = dto.CourseName;
        if (dto.AcademicYear != null) cert.AcademicYear = dto.AcademicYear;
        if (dto.CompletionDate.HasValue) cert.CompletionDate = dto.CompletionDate.Value;
        if (dto.Percentage.HasValue) cert.Percentage = dto.Percentage;
        if (dto.PerformanceLevel != null) cert.PerformanceLevel = dto.PerformanceLevel;
        if (dto.Remarks != null) cert.Remarks = dto.Remarks;
        if (dto.PrincipalName != null) cert.PrincipalName = dto.PrincipalName;
        if (dto.PrincipalDesignation != null) cert.PrincipalDesignation = dto.PrincipalDesignation;
        if (dto.DirectorName != null) cert.DirectorName = dto.DirectorName;
        if (dto.DirectorDesignation != null) cert.DirectorDesignation = dto.DirectorDesignation;
        if (dto.StaffName != null) cert.StaffName = dto.StaffName;
        if (dto.StaffDesignation != null) cert.StaffDesignation = dto.StaffDesignation;
        if (dto.TemplateId.HasValue) cert.TemplateId = dto.TemplateId;
        if (dto.ExpiryDate.HasValue) cert.ExpiryDate = dto.ExpiryDate;
        cert.UpdatedAt = DateTime.UtcNow;
        cert.UpdatedByUserId = CurrentUserId().ToString();

        await _certRepo.UpdateAsync(cert);
        return await GetCertificateByIdAsync(cert.Id);
    }

    public async Task<CertificateDto> ApproveCertificateAsync(Guid id, CertificateApproveDto dto)
    {
        var cert = await _certRepo.GetByIdAsync(id) ?? throw new AppException("Certificate not found.");

        if (dto.Approve)
        {
            cert.IsApproved = true;
            cert.ApprovedByUserId = CurrentUserId();
            cert.ApprovedAt = DateTime.UtcNow;
            cert.Status = "Approved";
            if (dto.MakeAvailableToStudent)
            {
                cert.IsAvailableToStudent = true;
                cert.IssuedAt = DateTime.UtcNow;
                cert.Status = "Issued";
            }
        }
        else
        {
            cert.Status = "Rejected";
            cert.Remarks = dto.RejectionReason ?? cert.Remarks;
        }

        cert.UpdatedAt = DateTime.UtcNow;
        cert.UpdatedByUserId = CurrentUserId().ToString();
        await _certRepo.UpdateAsync(cert);
        return await GetCertificateByIdAsync(cert.Id);
    }

    public async Task<CertificateDto> RevokeCertificateAsync(Guid id, CertificateRevokeDto dto)
    {
        var cert = await _certRepo.GetByIdAsync(id) ?? throw new AppException("Certificate not found.");
        cert.IsRevoked = true;
        cert.RevokeReason = dto.Reason;
        cert.RevokedAt = DateTime.UtcNow;
        cert.IsAvailableToStudent = false;
        cert.Status = "Revoked";
        cert.UpdatedAt = DateTime.UtcNow;
        cert.UpdatedByUserId = CurrentUserId().ToString();
        await _certRepo.UpdateAsync(cert);
        return await GetCertificateByIdAsync(cert.Id);
    }

    public async Task<CertificateDto> ReissueCertificateAsync(Guid id)
    {
        var cert = await _certRepo.GetByIdAsync(id) ?? throw new AppException("Certificate not found.");
        cert.IsRevoked = false;
        cert.RevokeReason = null;
        cert.RevokedAt = null;
        cert.Status = "PendingApproval";
        cert.IsApproved = false;
        cert.ApprovedAt = null;
        cert.IsAvailableToStudent = false;
        cert.UpdatedAt = DateTime.UtcNow;
        cert.UpdatedByUserId = CurrentUserId().ToString();
        await _certRepo.UpdateAsync(cert);
        return await GetCertificateByIdAsync(cert.Id);
    }

    public async Task DeleteCertificateAsync(Guid id)
    {
        var cert = await _certRepo.GetByIdAsync(id) ?? throw new AppException("Certificate not found.");
        await _certRepo.DeleteAsync(cert);
    }

    // ── Student / Parent ────────────────────────────────────────────────────

    public async Task<List<CertificateListItemDto>> GetMyCertificatesAsync()
    {
        var userId = CurrentUserId();
        var students = await _studentRepo.GetAllAsync(q => q.Where(s => s.UserId == userId));
        var student = students.FirstOrDefault();
        if (student == null) return new List<CertificateListItemDto>();

        var certs = await _certRepo.GetAllAsync(q => q
            .Where(c => c.StudentId == student.Id && c.IsAvailableToStudent && !c.IsRevoked)
            .OrderByDescending(c => c.CreatedAt));
        return certs.Select(ToListItem).ToList();
    }

    public async Task<List<CertificateListItemDto>> GetChildCertificatesAsync()
    {
        var userId = CurrentUserId();
        var userObj = await _userRepo.GetByIdAsync(userId);
        if (userObj == null) return new List<CertificateListItemDto>();

        var students = await _studentRepo.GetAllAsync(q => q
            .Where(s => s.ParentGuardianPhone != null && s.ParentGuardianPhone == userObj.Phone));

        var studentIds = students.Select(s => s.Id).ToList();
        if (!studentIds.Any()) return new List<CertificateListItemDto>();

        var certs = await _certRepo.GetAllAsync(q => q
            .Where(c => studentIds.Contains(c.StudentId) && c.IsAvailableToStudent && !c.IsRevoked)
            .OrderByDescending(c => c.CreatedAt));
        return certs.Select(ToListItem).ToList();
    }

    public async Task RecordDownloadAsync(Guid id)
    {
        var cert = await _certRepo.GetByIdAsync(id);
        if (cert == null) return;
        cert.DownloadCount++;
        cert.LastDownloadedAt = DateTime.UtcNow;
        await _certRepo.UpdateAsync(cert);
    }

    public async Task<CertificateDto?> VerifyCertificateAsync(string certificateNumber)
    {
        var certs = await _certRepo.GetAllAsync(q => q
            .Include(c => c.Template)
            .Where(c => c.CertificateNumber == certificateNumber && !c.IsRevoked));
        var cert = certs.FirstOrDefault();
        return cert == null ? null : ToDto(cert);
    }
}
