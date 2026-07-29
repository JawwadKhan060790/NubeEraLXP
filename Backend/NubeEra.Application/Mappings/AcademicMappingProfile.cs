using AutoMapper;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Mappings;

/// <summary>AutoMapper profile for the Academic module (Module, Lesson, Exam, Question, Result).</summary>
public class AcademicMappingProfile : Profile
{
    public AcademicMappingProfile()
    {
        // ── Module ── school-agnostic master content, keyed only by GradeLevel ─
        CreateMap<Module, ModuleDto>()
            .ForMember(dest => dest.GradeLevelName,        opt => opt.MapFrom(src => src.GradeLevel != null ? src.GradeLevel.Name : string.Empty))
            .ForMember(dest => dest.SubjectName,           opt => opt.MapFrom(src => src.Subject != null ? src.Subject.Name : string.Empty))
            .ForMember(dest => dest.CreatedByTeacherName,  opt => opt.MapFrom(src => src.CreatedByTeacher != null
                ? $"{src.CreatedByTeacher.FirstName} {src.CreatedByTeacher.LastName}".Trim()
                : string.Empty))
            .ForMember(dest => dest.LessonCount, opt => opt.MapFrom(src => src.Lessons != null ? src.Lessons.Count : 0))
            .ForMember(dest => dest.ExamCount,   opt => opt.MapFrom(src => src.Exams != null ? src.Exams.Count : 0))
            .ForMember(dest => dest.ExpectedPeriods, opt => opt.MapFrom(src => src.Lessons != null ? src.Lessons.Sum(l => l.ExpectedPeriods) : 0));

        CreateMap<ModuleCreateDto, Module>()
            .ForMember(dest => dest.Id,                 opt => opt.Ignore())
            .ForMember(dest => dest.IsActive,           opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.GradeLevel,         opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher,   opt => opt.Ignore())
            .ForMember(dest => dest.Lessons,            opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,          opt => opt.Ignore())
            .ForMember(dest => dest.Exams,              opt => opt.Ignore())
            .ForMember(dest => dest.SchoolAssignments,  opt => opt.Ignore());

        CreateMap<ModuleUpdateDto, Module>()
            .ForMember(dest => dest.Id,                 opt => opt.Ignore())
            .ForMember(dest => dest.GradeLevel,         opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher,   opt => opt.Ignore())
            .ForMember(dest => dest.Lessons,            opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,          opt => opt.Ignore())
            .ForMember(dest => dest.Exams,              opt => opt.Ignore())
            .ForMember(dest => dest.SchoolAssignments,  opt => opt.Ignore());

        // ── Lesson ── inherits grade-level/school-agnostic status from Module ──
        CreateMap<Lesson, LessonDto>()
            .ForMember(dest => dest.ModuleName, opt => opt.MapFrom(src => src.Module != null ? src.Module.Name : string.Empty))
            .ForMember(dest => dest.CreatedByTeacherName, opt => opt.MapFrom(src => src.CreatedByTeacher != null
                ? $"{src.CreatedByTeacher.FirstName} {src.CreatedByTeacher.LastName}".Trim()
                : string.Empty));

        CreateMap<LessonCreateDto, Lesson>()
            .ForMember(dest => dest.Id,                opt => opt.Ignore())
            .ForMember(dest => dest.IsActive,          opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.Module,            opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher,  opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,         opt => opt.Ignore())
            .ForMember(dest => dest.SchoolAssignments, opt => opt.Ignore());

        CreateMap<LessonUpdateDto, Lesson>()
            .ForMember(dest => dest.Id,                opt => opt.Ignore())
            .ForMember(dest => dest.Module,            opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher,  opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,         opt => opt.Ignore())
            .ForMember(dest => dest.SchoolAssignments, opt => opt.Ignore());

        // ── Exam ────────────────────────────────────────────────────────────
        CreateMap<Exam, ExamDto>()
            .ForMember(dest => dest.GradeName,            opt => opt.MapFrom(src => src.Grade != null ? src.Grade.GradeName : string.Empty))
            .ForMember(dest => dest.ModuleName,           opt => opt.MapFrom(src => src.Module != null ? src.Module.Name : string.Empty))
            .ForMember(dest => dest.LessonName,           opt => opt.MapFrom(src => src.Lesson != null ? src.Lesson.SubTopic : null))
            .ForMember(dest => dest.CreatedByTeacherName, opt => opt.MapFrom(src => src.CreatedByTeacher != null
                ? $"{src.CreatedByTeacher.FirstName} {src.CreatedByTeacher.LastName}".Trim()
                : string.Empty));

        CreateMap<ExamCreateDto, Exam>()
            .ForMember(dest => dest.Id,               opt => opt.Ignore())
            .ForMember(dest => dest.IsActive,         opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.Grade,            opt => opt.Ignore())
            .ForMember(dest => dest.Module,           opt => opt.Ignore())
            .ForMember(dest => dest.Lesson,           opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher, opt => opt.Ignore())
            .ForMember(dest => dest.Questions,        opt => opt.Ignore());

        CreateMap<ExamUpdateDto, Exam>()
            .ForMember(dest => dest.Id,               opt => opt.Ignore())
            .ForMember(dest => dest.Grade,            opt => opt.Ignore())
            .ForMember(dest => dest.Module,           opt => opt.Ignore())
            .ForMember(dest => dest.Lesson,           opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher, opt => opt.Ignore())
            .ForMember(dest => dest.Questions,        opt => opt.Ignore());

        // ── Subject ──
        CreateMap<Subject, SubjectDto>()
            .ForMember(dest => dest.GradeLevelName, opt => opt.MapFrom(src => src.GradeLevel != null ? src.GradeLevel.Name : string.Empty))
            .ForMember(dest => dest.CreatedByTeacherName, opt => opt.MapFrom(src => src.CreatedByTeacher != null 
                ? $"{src.CreatedByTeacher.FirstName} {src.CreatedByTeacher.LastName}".Trim() : string.Empty))
            .ForMember(dest => dest.UnitCount, opt => opt.MapFrom(src => src.Modules != null ? src.Modules.Count : 0))
            .ForMember(dest => dest.TopicCount, opt => opt.MapFrom(src => src.Modules != null ? src.Modules.Sum(m => m.Lessons != null ? m.Lessons.Count : 0) : 0))
            .ForMember(dest => dest.AssignedTeacherIds, opt => opt.MapFrom(src => src.TeacherSubjects != null ? src.TeacherSubjects.Select(ts => ts.TeacherId).ToList() : new List<Guid>()))
            .ForMember(dest => dest.AssignedTeacherNames, opt => opt.MapFrom(src => src.TeacherSubjects != null ? src.TeacherSubjects.Select(ts => $"{ts.Teacher.FirstName} {ts.Teacher.LastName}".Trim()).ToList() : new List<string>()))
            .ForMember(dest => dest.AssignedStudentIds, opt => opt.MapFrom(src => src.StudentSubjects != null ? src.StudentSubjects.Select(ss => ss.StudentId).ToList() : new List<Guid>()))
            .ForMember(dest => dest.AssignedStudentNames, opt => opt.MapFrom(src => src.StudentSubjects != null ? src.StudentSubjects.Select(ss => $"{ss.Student.FirstName} {ss.Student.LastName}".Trim()).ToList() : new List<string>()));

        CreateMap<SubjectCreateDto, Subject>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.GradeLevel, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher, opt => opt.Ignore())
            .ForMember(dest => dest.Modules, opt => opt.Ignore())
            .ForMember(dest => dest.TeacherSubjects, opt => opt.Ignore())
            .ForMember(dest => dest.StudentSubjects, opt => opt.Ignore());

        CreateMap<SubjectUpdateDto, Subject>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.GradeLevel, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByTeacher, opt => opt.Ignore())
            .ForMember(dest => dest.Modules, opt => opt.Ignore())
            .ForMember(dest => dest.TeacherSubjects, opt => opt.Ignore())
            .ForMember(dest => dest.StudentSubjects, opt => opt.Ignore());
    }
}
