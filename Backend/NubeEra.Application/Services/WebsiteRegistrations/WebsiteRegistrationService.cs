using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.WebsiteRegistrations;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Services.WebsiteRegistrations;

public class WebsiteRegistrationService : IWebsiteRegistrationService
{
    private readonly IGenericRepository<WebsiteRegistration> _registrationRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<InAppNotification> _notificationRepository;
    private readonly IGenericRepository<School> _schoolRepository;
    private readonly IGenericService<StudentCreateDto, StudentUpdateDto, StudentDto> _studentService;

    public WebsiteRegistrationService(
        IGenericRepository<WebsiteRegistration> registrationRepository,
        IGenericRepository<User> userRepository,
        IGenericRepository<InAppNotification> notificationRepository,
        IGenericRepository<School> schoolRepository,
        IGenericService<StudentCreateDto, StudentUpdateDto, StudentDto> studentService)
    {
        _registrationRepository = registrationRepository;
        _userRepository = userRepository;
        _notificationRepository = notificationRepository;
        _schoolRepository = schoolRepository;
        _studentService = studentService;
    }

    public async Task<object> SubmitRegistrationAsync(WebsiteRegistration registration)
    {
        if (registration == null)
            throw new AppException("Registration details are required.");

        if (string.IsNullOrWhiteSpace(registration.StudentFullName))
            throw new AppException("Student full name is required.");

        if (string.IsNullOrWhiteSpace(registration.MobileNumber))
            throw new AppException("Mobile number is required.");

        if (string.IsNullOrWhiteSpace(registration.ParentName))
            throw new AppException("Parent full name is required.");

        if (string.IsNullOrWhiteSpace(registration.ParentMobileNumber))
            throw new AppException("Parent mobile number is required.");

        if (string.IsNullOrWhiteSpace(registration.InterestedProgram))
            throw new AppException("Interested program is required.");

        registration.Id = Guid.NewGuid();
        registration.CreatedAt = DateTime.UtcNow;
        registration.Status = "New";

        await _registrationRepository.AddAsync(registration);

        // Send In-App Notifications to all active Admin/Staff
        var adminsAndStaff = await _userRepository.GetAllAsync(q => q
            .Include(u => u.Role)
            .Where(u => u.Role.RoleName == "Staff" || u.Role.RoleName == "Admin" || u.Role.RoleName == "SuperAdmin"));

        foreach (var user in adminsAndStaff)
        {
            await _notificationRepository.AddAsync(new InAppNotification
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Message = $"New B2C Registration Lead: {registration.StudentFullName} ({registration.InterestedProgram})",
                LinkUrl = "/admissions/registrations",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        return new { message = "Registration submitted successfully.", id = registration.Id };
    }

    public async Task<object> GetAllAsync(string? search, string? status, string? program, int page, int pageSize)
    {
        var registrations = await _registrationRepository.GetAllAsync(q =>
        {
            var query = q.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower().Trim();
                query = query.Where(r => 
                    r.StudentFullName.ToLower().Contains(searchLower) ||
                    r.ParentName.ToLower().Contains(searchLower) ||
                    (r.EmailAddress != null && r.EmailAddress.ToLower().Contains(searchLower)) ||
                    r.MobileNumber.Contains(searchLower) ||
                    r.ParentMobileNumber.Contains(searchLower));
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                query = query.Where(r => r.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(program) && program != "All")
            {
                query = query.Where(r => r.InterestedProgram == program);
            }

            return query.OrderByDescending(r => r.CreatedAt);
        });

        var totalItems = registrations.Count;
        var items = registrations
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new
        {
            items,
            totalItems,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalItems / pageSize)
        };
    }

    public async Task<WebsiteRegistration?> GetByIdAsync(Guid id)
    {
        return await _registrationRepository.GetByIdAsync(id);
    }

    public async Task<WebsiteRegistration> UpdateRegistrationAsync(Guid id, WebsiteRegistration updated)
    {
        var registration = await _registrationRepository.GetByIdAsync(id);
        if (registration == null)
            throw new AppException("Registration lead not found.");

        registration.StudentFullName = updated.StudentFullName;
        registration.MobileNumber = updated.MobileNumber;
        registration.EmailAddress = updated.EmailAddress;
        registration.City = updated.City;
        registration.GradeInterestedIn = updated.GradeInterestedIn;
        registration.InterestedProgram = updated.InterestedProgram;
        registration.ParentName = updated.ParentName;
        registration.ParentMobileNumber = updated.ParentMobileNumber;
        registration.Message = updated.Message;
        registration.Status = updated.Status;

        await _registrationRepository.UpdateAsync(registration);
        return registration;
    }

    public async Task ConvertToStudentAsync(Guid id, ConvertRegistrationDto dto)
    {
        if (dto == null)
            throw new AppException("Conversion details are required.");

        if (dto.GradeId == Guid.Empty)
            throw new AppException("Target Grade is required.");

        if (string.IsNullOrWhiteSpace(dto.StudentId))
            throw new AppException("Student customized registration number is required.");

        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new AppException("Student login password is required.");

        var registration = await _registrationRepository.GetByIdAsync(id);
        if (registration == null)
            throw new AppException("Registration lead not found.");

        if (registration.Status == "Converted")
            throw new AppException("Lead is already converted to an active student.");

        // Split student name
        var nameParts = registration.StudentFullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : registration.StudentFullName;
        var lastName = nameParts.Length > 1 ? nameParts[1] : "Student";

        // Find default NubeEra School (B2C)
        var schools = await _schoolRepository.GetAllAsync(q => q.Where(s => s.SchoolCode == "NUBEERA-SCHOOL"));
        var nubeeraSchool = schools.FirstOrDefault();
        if (nubeeraSchool == null)
        {
            var allSchools = await _schoolRepository.GetAllAsync();
            nubeeraSchool = allSchools.FirstOrDefault();
            if (nubeeraSchool == null)
                throw new AppException("No valid school found to scope the enrollment.");
        }

        var studentDto = new StudentCreateDto
        {
            SchoolId = nubeeraSchool.Id,
            GradeId = dto.GradeId,
            StudentId = dto.StudentId,
            RollNo = dto.RollNo,
            FirstName = firstName,
            LastName = lastName,
            Email = registration.EmailAddress ?? $"{dto.StudentId.ToLower()}@nubeera.b2c",
            Phone = registration.MobileNumber,
            ParentGuardianName = registration.ParentName,
            ParentGuardianPhone = registration.ParentMobileNumber,
            ParentGuardianEmail = registration.EmailAddress ?? $"{dto.StudentId.ToLower()}_parent@nubeera.b2c",
            Password = dto.Password,
            ParentPassword = string.IsNullOrWhiteSpace(dto.ParentPassword) ? registration.ParentMobileNumber : dto.ParentPassword,
            PersonalNote = $"Website B2C registration lead converted. Interested program: '{registration.InterestedProgram}'. Message: '{registration.Message}'."
        };

        // Invoke StudentService to handle complex user profile generation and parent linking
        await _studentService.CreateAsync(studentDto);

        // Set status to Converted
        registration.Status = "Converted";
        await _registrationRepository.UpdateAsync(registration);
    }
}
