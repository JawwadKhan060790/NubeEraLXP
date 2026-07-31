using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class StudentCalendarService : IStudentCalendarService
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<Scheduler> _schedulerRepo;
    private readonly IGenericRepository<TeacherSchedulePeriod> _periodRepo;
    private readonly IGenericRepository<Exam> _examRepo;
    private readonly IGenericRepository<Veriton.Domain.Entities.Event> _eventRepo;

    public StudentCalendarService(
        IGenericRepository<Student> studentRepo,
        IGenericRepository<Scheduler> schedulerRepo,
        IGenericRepository<TeacherSchedulePeriod> periodRepo,
        IGenericRepository<Exam> examRepo,
        IGenericRepository<Veriton.Domain.Entities.Event> eventRepo)
    {
        _studentRepo = studentRepo;
        _schedulerRepo = schedulerRepo;
        _periodRepo = periodRepo;
        _examRepo = examRepo;
        _eventRepo = eventRepo;
    }

    public async Task<List<StudentCalendarEventDto>> GetStudentCalendarAsync(Guid studentId, DateTime start, DateTime end)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student == null)
            throw new KeyNotFoundException("Student not found.");

        var startDate = start.Date;
        var endDate = end.Date;

        // 1. Fetch Schedulers (class periods)
        var schedulers = await _schedulerRepo.GetAllAsync(q => q
            .Include(s => s.Grade)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.Teacher)
            .Include(s => s.Section)
            .Where(s => s.IsActive && s.GradeId == student.GradeId &&
                        (!s.SectionId.HasValue || s.SectionId == student.SectionId) &&
                        s.Date.Date >= startDate && s.Date.Date <= endDate));

        // 2. Fetch TeacherSchedulePeriods for those days
        var periods = await _periodRepo.GetAllAsync(q => q
            .Where(p => p.GradeId == student.GradeId &&
                        p.PeriodDate.Date >= startDate && p.PeriodDate.Date <= endDate));

        var periodMap = periods.ToDictionary(p => p.SchedulerId);

        // 3. Fetch Exams
        var exams = await _examRepo.GetAllAsync(q => q
            .Include(e => e.Module)
            .Include(e => e.Lesson)
            .Include(e => e.Grade)
            .Include(e => e.Section)
            .Where(e => e.IsActive && e.GradeId == student.GradeId &&
                        (!e.SectionId.HasValue || e.SectionId == student.SectionId) &&
                        e.Date.Date >= startDate && e.Date.Date <= endDate));

        // 4. Fetch School Events
        var events = await _eventRepo.GetAllAsync(q => q
            .Where(e => e.SchoolId == student.SchoolId &&
                        e.Date.Date >= startDate && e.Date.Date <= endDate));

        var result = new List<StudentCalendarEventDto>();

        // Map Schedulers
        foreach (var s in schedulers)
        {
            periodMap.TryGetValue(s.Id, out var period);
            var status = period?.Status.ToString() ?? "NotStarted";
            var color = GetStatusColor(period?.Status ?? PeriodStatus.NotStarted);

            result.Add(new StudentCalendarEventDto
            {
                Id = s.Id,
                Type = "Class",
                Title = $"{s.Module?.Name ?? "Class"} - {s.Lesson?.SubTopic ?? "Topic"}",
                Description = $"Teacher: {s.Teacher.FirstName} {s.Teacher.LastName}\nTime: {s.StartTime} - {s.EndTime}\nStatus: {status}",
                Start = s.Date.Date.Add(s.StartTime),
                End = s.Date.Date.Add(s.EndTime),
                Color = color,
                Status = status,
                SubjectName = s.Module?.Name,
                TeacherName = $"{s.Teacher.FirstName} {s.Teacher.LastName}"
            });
        }

        // Map Exams
        foreach (var exam in exams)
        {
            result.Add(new StudentCalendarEventDto
            {
                Id = exam.Id,
                Type = "Exam",
                Title = $"[Exam] {exam.Title ?? "Unit Test"}",
                Description = $"Subject: {exam.Module.Name}\nDuration: {exam.DurationMinutes} mins\nTotal Marks: {exam.TotalMarks}\nPassing Marks: {exam.PassingMarks}",
                Start = exam.Date,
                End = exam.Date.AddMinutes(exam.DurationMinutes ?? 60),
                Color = "#F59E0B", // Amber
                Status = "Scheduled",
                SubjectName = exam.Module.Name
            });
        }

        // Map Events
        foreach (var ev in events)
        {
            result.Add(new StudentCalendarEventDto
            {
                Id = ev.Id,
                Type = "Event",
                Title = $"[Event] {ev.Title}",
                Description = $"{ev.Description}\nVenue: {ev.Venue}",
                Start = ev.Date,
                End = ev.Date.AddHours(2), // default to 2 hours
                Color = "#8B5CF6", // Violet
                Status = ev.Status,
                Venue = ev.Venue
            });
        }

        return result.OrderBy(r => r.Start).ToList();
    }

    private static string GetStatusColor(PeriodStatus status) => status switch
    {
        PeriodStatus.NotStarted => "#3B82F6",  // Blue
        PeriodStatus.InProgress => "#F59E0B",  // Orange
        PeriodStatus.Completed  => "#16A34A",  // Green
        PeriodStatus.Missed     => "#DC2626",  // Red
        _                       => "#6B7280"
    };
}
