using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Infrastructure.Services
{
    public class BulkImportService : IBulkImportService
    {
        private readonly IGenericRepository<Student> _studentRepository;
        private readonly IUserRepository _userRepository;
        private readonly IGenericRepository<Role> _roleRepository;
        private readonly IGenericRepository<School> _schoolRepository;
        private readonly IGenericRepository<Grade> _gradeRepository;
        private readonly IGenericRepository<GradeSection> _sectionRepository;
        private readonly IGenericRepository<Attendance> _attendanceRepository;
        private readonly IGenericRepository<Teacher> _teacherRepository;
        private readonly IGenericRepository<Scheduler> _schedulerRepository;
        private readonly IGenericRepository<Exam> _examRepository;
        private readonly IGenericRepository<Question> _questionRepository;
        private readonly IGenericRepository<Module> _moduleRepository;
        private readonly IGenericRepository<Lesson> _lessonRepository;
        private readonly IGenericRepository<GradeLevel> _gradeLevelRepository;
        private readonly IGenericRepository<Subject> _subjectRepository;
        private readonly IGenericRepository<SchoolUnitAssignment> _unitAssignmentRepository;
        private readonly IGenericRepository<SchoolTopicAssignment> _topicAssignmentRepository;

        public BulkImportService(
            IGenericRepository<Student> studentRepository,
            IUserRepository userRepository,
            IGenericRepository<Role> roleRepository,
            IGenericRepository<School> schoolRepository,
            IGenericRepository<Grade> gradeRepository,
            IGenericRepository<GradeSection> sectionRepository,
            IGenericRepository<Attendance> attendanceRepository,
            IGenericRepository<Teacher> teacherRepository,
            IGenericRepository<Scheduler> schedulerRepository,
            IGenericRepository<Exam> examRepository,
            IGenericRepository<Question> questionRepository,
            IGenericRepository<Module> moduleRepository,
            IGenericRepository<Lesson> lessonRepository,
            IGenericRepository<GradeLevel> gradeLevelRepository,
            IGenericRepository<Subject> subjectRepository,
            IGenericRepository<SchoolUnitAssignment> unitAssignmentRepository,
            IGenericRepository<SchoolTopicAssignment> topicAssignmentRepository)
        {
            _studentRepository = studentRepository;
            _userRepository = userRepository;
            _roleRepository = roleRepository;
            _schoolRepository = schoolRepository;
            _gradeRepository = gradeRepository;
            _sectionRepository = sectionRepository;
            _attendanceRepository = attendanceRepository;
            _teacherRepository = teacherRepository;
            _schedulerRepository = schedulerRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _moduleRepository = moduleRepository;
            _lessonRepository = lessonRepository;
            _gradeLevelRepository = gradeLevelRepository;
            _subjectRepository = subjectRepository;
            _unitAssignmentRepository = unitAssignmentRepository;
            _topicAssignmentRepository = topicAssignmentRepository;
        }

        public async Task<ImportResultDto> ImportStudentsAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                // Map headers
                var headers = GetHeaders(table[0]);
                var studentRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Student"))).FirstOrDefault()
                    ?? throw new Exception("Student role not found in database.");
                var parentRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Parent"))).FirstOrDefault()
                    ?? throw new Exception("Parent role not found in database.");

                var grades = await _gradeRepository.GetAllAsync(q => q.Where(g => g.SchoolId == schoolId && g.IsActive));
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");

                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var firstName = GetVal(row, headers, "firstname", "first name");
                    var lastName = GetVal(row, headers, "lastname", "last name");
                    var email = GetVal(row, headers, "email", "studentemail", "student email");
                    var phone = GetVal(row, headers, "phone", "studentphone", "student phone");
                    var studentId = GetVal(row, headers, "studentid", "student id");
                    var rollNo = GetVal(row, headers, "rollno", "roll no");
                    var gradeName = GetVal(row, headers, "gradename", "grade name", "grade");
                    var sectionCode = GetVal(row, headers, "sectioncode", "section code", "section", "division");
                    var parentName = GetVal(row, headers, "parentguardianname", "parent name", "parent guardian name");
                    var parentPhone = GetVal(row, headers, "parentguardianphone", "parent phone", "parent guardian phone");
                    var parentEmail = GetVal(row, headers, "parentguardianemail", "parent email", "parent guardian email");
                    var gender = GetVal(row, headers, "gender");
                    var address = GetVal(row, headers, "address");
                    var dobStr = GetVal(row, headers, "dateofbirth", "dob", "date of birth");

                    if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
                    {
                        result.Errors.Add($"Row {r + 1}: First Name and Last Name are required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(gradeName))
                    {
                        result.Errors.Add($"Row {r + 1}: Grade Name is required.");
                        continue;
                    }

                    var grade = grades.FirstOrDefault(g => 
                        g.GradeName.Equals(gradeName, StringComparison.OrdinalIgnoreCase) || 
                        g.GradeLevel.Equals(gradeName, StringComparison.OrdinalIgnoreCase));

                    if (grade == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Grade '{gradeName}' not found in school.");
                        continue;
                    }

                    GradeSection? section = null;
                    if (!string.IsNullOrEmpty(sectionCode))
                    {
                        var sections = await _sectionRepository.GetAllAsync(q => q.Where(s => s.SchoolId == schoolId && s.GradeId == grade.Id && s.IsActive));
                        section = sections.FirstOrDefault(s => s.SectionCode.Equals(sectionCode, StringComparison.OrdinalIgnoreCase));
                        if (section == null)
                        {
                            // Auto create section
                            section = new GradeSection
                            {
                                SchoolId = schoolId,
                                GradeId = grade.Id,
                                SectionCode = sectionCode.ToUpper(),
                                SectionName = $"{sectionCode.ToUpper()} Section",
                                Capacity = 40,
                                IsActive = true
                            };
                            await _sectionRepository.AddAsync(section);
                        }
                    }

                    DateTime? dob = null;
                    if (!string.IsNullOrEmpty(dobStr) && DateTime.TryParse(dobStr, out var d))
                    {
                        dob = d;
                    }

                    // Student user account
                    var emailToUse = email;
                    if (string.IsNullOrEmpty(emailToUse))
                    {
                        var cleanFirst = firstName.ToLower().Replace(" ", "");
                        var cleanLast = lastName.ToLower().Replace(" ", "");
                        var cleanRoll = string.IsNullOrEmpty(rollNo) ? Guid.NewGuid().ToString("N")[..4] : rollNo.Replace(" ", "");
                        emailToUse = $"{cleanFirst}.{cleanLast}.{cleanRoll}@veriton.student";
                    }

                    var existingUser = await _userRepository.GetByEmailAsync(emailToUse.Trim().ToLower());
                    if (existingUser != null && !string.IsNullOrEmpty(email))
                    {
                        result.Errors.Add($"Row {r + 1}: User with student email '{email}' already exists.");
                        continue;
                    }

                    User? studentUser = existingUser;
                    if (studentUser == null)
                    {
                        studentUser = new User(
                            email: emailToUse.Trim().ToLower(),
                            passwordHash: passwordHash,
                            roleId: studentRole.Id,
                            schoolId: schoolId
                        )
                        {
                            FirstName = firstName,
                            LastName = lastName,
                            Phone = phone
                        };
                        await _userRepository.AddAsync(studentUser);
                    }

                    // Parent user account
                    User? parentUser = null;
                    if (!string.IsNullOrEmpty(parentPhone) || !string.IsNullOrEmpty(parentEmail))
                    {
                        var pPhone = parentPhone?.Trim() ?? "";
                        var pEmail = parentEmail?.Trim().ToLower() ?? "";

                        if (!string.IsNullOrEmpty(pPhone))
                        {
                            parentUser = await _userRepository.GetByEmailOrPhoneAsync(pPhone);
                        }
                        if (parentUser == null && !string.IsNullOrEmpty(pEmail))
                        {
                            parentUser = await _userRepository.GetByEmailOrPhoneAsync(pEmail);
                        }

                        if (parentUser == null)
                        {
                            var pEmailToUse = pEmail;
                            if (string.IsNullOrEmpty(pEmailToUse))
                            {
                                pEmailToUse = $"{pPhone}@veriton.parent";
                            }
                            var existingParentByEmail = await _userRepository.GetByEmailOrPhoneAsync(pEmailToUse);
                            if (existingParentByEmail != null)
                            {
                                pEmailToUse = $"{pPhone}_{Guid.NewGuid().ToString("N")[..4]}@veriton.parent";
                            }

                            parentUser = new User(
                                email: pEmailToUse,
                                passwordHash: passwordHash,
                                roleId: parentRole.Id,
                                schoolId: schoolId
                            )
                            {
                                FirstName = parentName ?? "Parent",
                                LastName = "",
                                Phone = pPhone
                            };
                            await _userRepository.AddAsync(parentUser);
                        }
                    }

                    var finalStudentId = string.IsNullOrEmpty(studentId)
                        ? await Veriton.Application.Common.Helpers.StudentIdGenerator.GenerateNextStudentIdAsync(schoolId, _schoolRepository, _studentRepository)
                        : studentId;

                    var student = new Student
                    {
                        SchoolId = schoolId,
                        GradeId = grade.Id,
                        SectionId = section?.Id,
                        UserId = studentUser.Id,
                        StudentId = finalStudentId,
                        RollNo = rollNo,
                        FirstName = firstName,
                        LastName = lastName,
                        Email = studentUser.Email,
                        Phone = phone,
                        DateOfBirth = dob,
                        Gender = gender,
                        Address = address,
                        AdmissionDate = DateTime.UtcNow,
                        ParentGuardianName = parentName ?? parentUser?.FirstName ?? "Parent",
                        ParentGuardianPhone = parentPhone ?? parentUser?.Phone,
                        ParentGuardianEmail = parentEmail ?? parentUser?.Email,
                        IsActive = true
                    };
                    await _studentRepository.AddAsync(student);
                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing student file: {ex.Message}");
            }
            return result;
        }

        public async Task<ImportResultDto> ImportAttendanceAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                var headers = GetHeaders(table[0]);
                var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.SchoolId == schoolId && s.IsActive));
                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var identifier = GetVal(row, headers, "studentid", "student id", "rollno", "roll no", "email", "studentemail", "student email");
                    var dateStr = GetVal(row, headers, "date");
                    var statusStr = GetVal(row, headers, "status");
                    var remarks = GetVal(row, headers, "remarks");

                    if (string.IsNullOrEmpty(identifier))
                    {
                        result.Errors.Add($"Row {r + 1}: Student identifier (ID, Roll No, or Email) is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(dateStr) || !DateTime.TryParse(dateStr, out var date))
                    {
                        result.Errors.Add($"Row {r + 1}: Valid Date is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(statusStr) || !Enum.TryParse<AttendanceStatus>(statusStr, true, out var status))
                    {
                        result.Errors.Add($"Row {r + 1}: Valid Status (Present, Absent, Late, Excused) is required.");
                        continue;
                    }

                    var student = students.FirstOrDefault(s =>
                        s.StudentId.Equals(identifier, StringComparison.OrdinalIgnoreCase) ||
                        (s.RollNo != null && s.RollNo.Equals(identifier, StringComparison.OrdinalIgnoreCase)) ||
                        (s.Email != null && s.Email.Equals(identifier, StringComparison.OrdinalIgnoreCase)));

                    if (student == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Student '{identifier}' not found in school.");
                        continue;
                    }

                    var existingAttendance = await _attendanceRepository.GetAllAsync(q => q.Where(a => a.StudentId == student.Id && a.Date == date.Date));
                    var att = existingAttendance.FirstOrDefault();
                    if (att != null)
                    {
                        att.Status = status;
                        att.Remarks = remarks;
                        await _attendanceRepository.UpdateAsync(att);
                    }
                    else
                    {
                        att = new Attendance
                        {
                            SchoolId = schoolId,
                            StudentId = student.Id,
                            Date = date.Date,
                            Status = status,
                            Remarks = remarks
                        };
                        await _attendanceRepository.AddAsync(att);
                    }
                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing attendance file: {ex.Message}");
            }
            return result;
        }

        public async Task<ImportResultDto> ImportTeacherScheduleAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                var headers = GetHeaders(table[0]);
                var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.SchoolId == schoolId && t.IsActive));
                var grades = await _gradeRepository.GetAllAsync(q => q.Where(g => g.SchoolId == schoolId && g.IsActive));

                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var teacherIdentifier = GetVal(row, headers, "teacher", "teacheremail", "teacher email", "employeeid", "employee id", "teachername", "teacher name");
                    var gradeName = GetVal(row, headers, "gradename", "grade name", "grade");
                    var sectionCode = GetVal(row, headers, "sectioncode", "section code", "section", "division");
                    var dateStr = GetVal(row, headers, "date");
                    var startTimeStr = GetVal(row, headers, "starttime", "start time");
                    var endTimeStr = GetVal(row, headers, "endtime", "end time");
                    var moduleName = GetVal(row, headers, "modulename", "module name", "module", "unit", "unitname");
                    var lessonName = GetVal(row, headers, "lessonname", "lesson name", "lesson", "topic", "topicname");

                    if (string.IsNullOrEmpty(teacherIdentifier))
                    {
                        result.Errors.Add($"Row {r + 1}: Teacher identifier is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(gradeName))
                    {
                        result.Errors.Add($"Row {r + 1}: Grade Name is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(dateStr) || !DateTime.TryParse(dateStr, out var date))
                    {
                        result.Errors.Add($"Row {r + 1}: Valid Date is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(startTimeStr) || !TimeSpan.TryParse(startTimeStr, out var startTime))
                    {
                        result.Errors.Add($"Row {r + 1}: Valid Start Time is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(endTimeStr) || !TimeSpan.TryParse(endTimeStr, out var endTime))
                    {
                        result.Errors.Add($"Row {r + 1}: Valid End Time is required.");
                        continue;
                    }

                    var teacher = teachers.FirstOrDefault(t =>
                        t.Email.Equals(teacherIdentifier, StringComparison.OrdinalIgnoreCase) ||
                        t.EmployeeId.Equals(teacherIdentifier, StringComparison.OrdinalIgnoreCase) ||
                        $"{t.FirstName} {t.LastName}".Equals(teacherIdentifier, StringComparison.OrdinalIgnoreCase));

                    if (teacher == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Teacher '{teacherIdentifier}' not found in school.");
                        continue;
                    }

                    var grade = grades.FirstOrDefault(g => 
                        g.GradeName.Equals(gradeName, StringComparison.OrdinalIgnoreCase) || 
                        g.GradeLevel.Equals(gradeName, StringComparison.OrdinalIgnoreCase));

                    if (grade == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Grade '{gradeName}' not found in school.");
                        continue;
                    }

                    GradeSection? section = null;
                    if (!string.IsNullOrEmpty(sectionCode))
                    {
                        var sections = await _sectionRepository.GetAllAsync(q => q.Where(s => s.SchoolId == schoolId && s.GradeId == grade.Id && s.IsActive));
                        section = sections.FirstOrDefault(s => s.SectionCode.Equals(sectionCode, StringComparison.OrdinalIgnoreCase));
                    }

                    Module? module = null;
                    if (!string.IsNullOrEmpty(moduleName))
                    {
                        var modules = await _moduleRepository.GetAllAsync(q => q.Where(m => m.Name.Equals(moduleName, StringComparison.OrdinalIgnoreCase) && m.IsActive));
                        module = modules.FirstOrDefault();
                    }

                    Lesson? lesson = null;
                    if (!string.IsNullOrEmpty(lessonName))
                    {
                        var lessons = await _lessonRepository.GetAllAsync(q => q.Where(l => l.SubTopic.Equals(lessonName, StringComparison.OrdinalIgnoreCase) && l.IsActive));
                        lesson = lessons.FirstOrDefault();
                    }

                    var scheduler = new Scheduler
                    {
                        SchoolId = schoolId,
                        GradeId = grade.Id,
                        SectionId = section?.Id,
                        TeacherId = teacher.Id,
                        ModuleId = module?.Id,
                        LessonId = lesson?.Id,
                        Date = date.Date,
                        StartTime = startTime,
                        EndTime = endTime,
                        IsActive = true
                    };
                    await _schedulerRepository.AddAsync(scheduler);
                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing schedule file: {ex.Message}");
            }
            return result;
        }

        public async Task<ImportResultDto> ImportMcqsAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                var headers = GetHeaders(table[0]);
                var grades = await _gradeRepository.GetAllAsync(q => q.Where(g => g.SchoolId == schoolId && g.IsActive));

                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var examTitle = GetVal(row, headers, "examtitle", "exam title", "exam");
                    var gradeName = GetVal(row, headers, "gradename", "grade name", "grade");
                    var sectionCode = GetVal(row, headers, "sectioncode", "section code", "section");
                    var moduleName = GetVal(row, headers, "modulename", "module name", "module", "unit", "unitname");
                    var lessonName = GetVal(row, headers, "lessonname", "lesson name", "lesson", "topic", "topicname");
                    var durationVal = GetVal(row, headers, "durationmins", "duration mins", "duration", "durationminutes");
                    var totalMarksVal = GetVal(row, headers, "totalmarks", "total marks", "marks");
                    var releaseDateVal = GetVal(row, headers, "releasedate", "release date", "date", "examdate", "exam date");
                    var questionText = GetVal(row, headers, "questiontext", "question text", "question");
                    var optionA = GetVal(row, headers, "optiona", "option a", "a");
                    var optionB = GetVal(row, headers, "optionb", "option b", "b");
                    var optionC = GetVal(row, headers, "optionc", "option c", "c");
                    var optionD = GetVal(row, headers, "optiond", "option d", "d");
                    var correctAnswer = GetVal(row, headers, "correctanswer", "correct answer", "answer");

                    if (string.IsNullOrEmpty(examTitle))
                    {
                        result.Errors.Add($"Row {r + 1}: Exam Title is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(gradeName))
                    {
                        result.Errors.Add($"Row {r + 1}: Grade Name is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(moduleName))
                    {
                        result.Errors.Add($"Row {r + 1}: Module/Unit Name is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(questionText))
                    {
                        result.Errors.Add($"Row {r + 1}: Question Text is required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(optionA) || string.IsNullOrEmpty(optionB) || string.IsNullOrEmpty(optionC) || string.IsNullOrEmpty(optionD))
                    {
                        result.Errors.Add($"Row {r + 1}: All four options (A, B, C, D) are required.");
                        continue;
                    }

                    if (string.IsNullOrEmpty(correctAnswer) || !new[] { "A", "B", "C", "D" }.Contains(correctAnswer.ToUpper().Trim()))
                    {
                        result.Errors.Add($"Row {r + 1}: Correct Answer must be 'A', 'B', 'C', or 'D'.");
                        continue;
                    }

                    var grade = grades.FirstOrDefault(g => 
                        g.GradeName.Equals(gradeName, StringComparison.OrdinalIgnoreCase) || 
                        g.GradeLevel.Equals(gradeName, StringComparison.OrdinalIgnoreCase));

                    if (grade == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Grade '{gradeName}' not found in school.");
                        continue;
                    }

                    GradeSection? section = null;
                    if (!string.IsNullOrEmpty(sectionCode))
                    {
                        var sections = await _sectionRepository.GetAllAsync(q => q.Where(s => s.SchoolId == schoolId && s.GradeId == grade.Id && s.IsActive));
                        section = sections.FirstOrDefault(s => s.SectionCode.Equals(sectionCode, StringComparison.OrdinalIgnoreCase));
                    }

                    var modules = await _moduleRepository.GetAllAsync(q => q.Where(m => m.Name.Equals(moduleName, StringComparison.OrdinalIgnoreCase) && m.IsActive));
                    var module = modules.FirstOrDefault();
                    if (module == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Unit/Module '{moduleName}' not found.");
                        continue;
                    }

                    Lesson? lesson = null;
                    if (!string.IsNullOrEmpty(lessonName))
                    {
                        var lessons = await _lessonRepository.GetAllAsync(q => q.Where(l => l.SubTopic.Equals(lessonName, StringComparison.OrdinalIgnoreCase) && l.IsActive));
                        lesson = lessons.FirstOrDefault();
                    }

                    // Find or create Exam
                    var exams = await _examRepository.GetAllAsync(q => q.Where(e => 
                        e.SchoolId == schoolId && 
                        e.GradeId == grade.Id && 
                        e.Title.Equals(examTitle, StringComparison.OrdinalIgnoreCase) && 
                        e.IsActive));
                    
                    var exam = exams.FirstOrDefault();
                    if (exam == null)
                    {
                        int durationMinutes = 60;
                        if (!string.IsNullOrEmpty(durationVal) && int.TryParse(durationVal, out var parsedDuration) && parsedDuration > 0)
                        {
                            durationMinutes = parsedDuration;
                        }

                        int totalMarks = 100;
                        if (!string.IsNullOrEmpty(totalMarksVal) && int.TryParse(totalMarksVal, out var parsedMarks) && parsedMarks > 0)
                        {
                            totalMarks = parsedMarks;
                        }

                        DateTime examDate = DateTime.UtcNow.Date;
                        if (!string.IsNullOrEmpty(releaseDateVal) && DateTime.TryParse(releaseDateVal, out var parsedDate))
                        {
                            examDate = parsedDate;
                        }

                        exam = new Exam
                        {
                            SchoolId = schoolId,
                            GradeId = grade.Id,
                            SectionId = section?.Id,
                            ModuleId = module.Id,
                            LessonId = lesson?.Id,
                            Date = examDate,
                            Title = examTitle,
                            TotalMarks = totalMarks,
                            PassingMarks = (int)Math.Ceiling(totalMarks * 0.4),
                            DurationMinutes = durationMinutes,
                            IsActive = true
                        };
                        await _examRepository.AddAsync(exam);
                    }

                    // Create Question
                    var question = new Question
                    {
                        SchoolId = schoolId,
                        ExamId = exam.Id,
                        ModuleId = module.Id,
                        LessonId = lesson?.Id,
                        QuestionText = questionText,
                        OptionA = optionA,
                        OptionB = optionB,
                        OptionC = optionC,
                        OptionD = optionD,
                        CorrectAnswer = correctAnswer.ToUpper().Trim(),
                        IsActive = true
                    };
                    await _questionRepository.AddAsync(question);
                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing MCQ file: {ex.Message}");
            }
            return result;
        }

        public async Task<ImportResultDto> ImportUnitsAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                var headers = GetHeaders(table[0]);
                var gradeLevels = await _gradeLevelRepository.GetAllAsync(q => q.Where(g => g.IsActive));
                var subjects = await _subjectRepository.GetAllAsync(q => q.Where(s => s.IsActive));

                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var unitName = GetVal(row, headers, "unitname", "unit name", "unit", "modulename", "module name", "module", "name");
                    var gradeLevelStr = GetVal(row, headers, "gradelevel", "grade level", "grade", "grade level name", "grade name");
                    var subjectName = GetVal(row, headers, "subjectname", "subject name", "subject");
                    var description = GetVal(row, headers, "description", "unit description", "desc");
                    var creditsVal = GetVal(row, headers, "credits", "credit");
                    var pdfFileUrl = GetVal(row, headers, "pdffileurl", "pdf file url", "pdf url", "pdf");
                    var isActiveVal = GetVal(row, headers, "isactive", "is active", "active");

                    if (string.IsNullOrWhiteSpace(unitName))
                    {
                        result.Errors.Add($"Row {r + 1}: Unit Name is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(gradeLevelStr))
                    {
                        result.Errors.Add($"Row {r + 1}: Grade Level is required.");
                        continue;
                    }

                    var cleanGradeStr = gradeLevelStr.Trim();
                    GradeLevel? gradeLevel = gradeLevels.FirstOrDefault(gl =>
                        gl.Name.Equals(cleanGradeStr, StringComparison.OrdinalIgnoreCase));

                    if (gradeLevel == null)
                    {
                        var digitsOnly = new string(cleanGradeStr.Where(char.IsDigit).ToArray());
                        if (int.TryParse(digitsOnly, out var lvlNum))
                        {
                            gradeLevel = gradeLevels.FirstOrDefault(gl => gl.LevelNumber == lvlNum);
                        }
                    }

                    if (gradeLevel == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Grade Level '{gradeLevelStr}' not found.");
                        continue;
                    }

                    Subject? subject = null;
                    if (!string.IsNullOrWhiteSpace(subjectName))
                    {
                        subject = subjects.FirstOrDefault(s => s.Name.Equals(subjectName.Trim(), StringComparison.OrdinalIgnoreCase));
                    }

                    var existingModules = await _moduleRepository.GetAllAsync(q => q.Where(m =>
                        m.GradeLevelId == gradeLevel.Id && m.Name.Equals(unitName.Trim(), StringComparison.OrdinalIgnoreCase)));
                    var unit = existingModules.FirstOrDefault();

                    bool isActive = true;
                    if (!string.IsNullOrWhiteSpace(isActiveVal) && bool.TryParse(isActiveVal, out var actParsed))
                        isActive = actParsed;

                    int credits = 0;
                    if (!string.IsNullOrWhiteSpace(creditsVal) && int.TryParse(creditsVal, out var crdParsed))
                        credits = crdParsed;

                    if (unit == null)
                    {
                        unit = new Module
                        {
                            GradeLevelId = gradeLevel.Id,
                            SubjectId = subject?.Id,
                            Name = unitName.Trim(),
                            Description = description,
                            Credits = credits,
                            PdfFileUrl = pdfFileUrl,
                            IsActive = isActive
                        };
                        await _moduleRepository.AddAsync(unit);
                    }
                    else
                    {
                        unit.SubjectId = subject?.Id ?? unit.SubjectId;
                        unit.Description = description ?? unit.Description;
                        unit.Credits = credits != 0 ? credits : unit.Credits;
                        unit.PdfFileUrl = pdfFileUrl ?? unit.PdfFileUrl;
                        unit.IsActive = isActive;
                        await _moduleRepository.UpdateAsync(unit);
                    }

                    if (schoolId != Guid.Empty)
                    {
                        var existingAssign = (await _unitAssignmentRepository.GetAllAsync(q =>
                            q.Where(a => a.SchoolId == schoolId && a.UnitId == unit.Id))).FirstOrDefault();
                        if (existingAssign == null)
                        {
                            await _unitAssignmentRepository.AddAsync(new SchoolUnitAssignment
                            {
                                SchoolId = schoolId,
                                UnitId = unit.Id,
                                AssignedBy = Guid.Empty,
                                AssignedDate = DateTime.UtcNow
                            });
                        }
                    }

                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing units file: {ex.Message}");
            }
            return result;
        }

        public async Task<ImportResultDto> ImportTopicsAsync(Guid schoolId, Stream excelStream)
        {
            var result = new ImportResultDto();
            try
            {
                var table = await ParseStreamAsync(excelStream);
                if (table.Count <= 1)
                {
                    result.Success = false;
                    result.Errors.Add("File is empty or has no data rows.");
                    return result;
                }

                var headers = GetHeaders(table[0]);
                var allModules = await _moduleRepository.GetAllAsync(q => q.Where(m => m.IsActive));

                int importedCount = 0;

                for (int r = 1; r < table.Count; r++)
                {
                    var row = table[r];
                    if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace)) continue;

                    var subTopic = GetVal(row, headers, "topicname", "topic name", "topic", "subtopic", "sub topic", "lessonname", "lesson name", "lesson");
                    var unitName = GetVal(row, headers, "unitname", "unit name", "unit", "modulename", "module name", "module");
                    var displayOrderVal = GetVal(row, headers, "displayorder", "display order", "order");
                    var serialNumberVal = GetVal(row, headers, "serialnumber", "serial number", "serial");
                    var totalHoursVal = GetVal(row, headers, "totalhours", "total hours", "hours");
                    var expectedPeriodsVal = GetVal(row, headers, "expectedperiods", "expected periods", "periods");
                    var activity = GetVal(row, headers, "activity", "activity type", "activity name");
                    var videoUrl = GetVal(row, headers, "videourl", "video url", "video");
                    var diagramUrl = GetVal(row, headers, "diagramurl", "diagram url", "diagram");
                    var pdfFileUrl = GetVal(row, headers, "pdffileurl", "pdf file url", "pdf url", "pdf");
                    var source = GetVal(row, headers, "source");
                    var procedure = GetVal(row, headers, "procedure");
                    var code = GetVal(row, headers, "code");
                    var requiredMaterial = GetVal(row, headers, "requiredmaterial", "required material", "materials");
                    var whatYouGet = GetVal(row, headers, "whatyouget", "what you get");
                    var isActivityVal = GetVal(row, headers, "isactivity", "is activity");
                    var isPythonVal = GetVal(row, headers, "ispythonactivity", "is python activity", "python");
                    var isRoboticsVal = GetVal(row, headers, "isroboticsactivity", "is robotics activity", "robotics");
                    var isAiToolVal = GetVal(row, headers, "isaitoolactivity", "is ai tool activity", "aitool", "ai tool");
                    var browserUrl = GetVal(row, headers, "browserurl", "browser url");
                    var isActiveVal = GetVal(row, headers, "isactive", "is active", "active");

                    if (string.IsNullOrWhiteSpace(subTopic))
                    {
                        result.Errors.Add($"Row {r + 1}: Topic Name / SubTopic is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(unitName))
                    {
                        result.Errors.Add($"Row {r + 1}: Unit / Module Name is required.");
                        continue;
                    }

                    var parentModule = allModules.FirstOrDefault(m =>
                        m.Name.Equals(unitName.Trim(), StringComparison.OrdinalIgnoreCase));

                    if (parentModule == null)
                    {
                        result.Errors.Add($"Row {r + 1}: Unit '{unitName}' not found.");
                        continue;
                    }

                    int displayOrder = int.TryParse(displayOrderVal, out var dispOrd) ? dispOrd : 0;
                    int serialNumber = int.TryParse(serialNumberVal, out var serNum) ? serNum : r;
                    int totalHours = int.TryParse(totalHoursVal, out var hrs) ? hrs : 0;
                    int expectedPeriods = int.TryParse(expectedPeriodsVal, out var expP) ? expP : 1;

                    bool isActive = true;
                    if (!string.IsNullOrWhiteSpace(isActiveVal) && bool.TryParse(isActiveVal, out var actParsed))
                        isActive = actParsed;

                    bool isActivity = false;
                    if (!string.IsNullOrWhiteSpace(isActivityVal) && bool.TryParse(isActivityVal, out var actvParsed))
                        isActivity = actvParsed;
                    else if (!string.IsNullOrWhiteSpace(activity))
                        isActivity = true;

                    bool isPython = !string.IsNullOrWhiteSpace(isPythonVal) && bool.TryParse(isPythonVal, out var pyParsed) && pyParsed;
                    bool isRobotics = !string.IsNullOrWhiteSpace(isRoboticsVal) && bool.TryParse(isRoboticsVal, out var robParsed) && robParsed;
                    bool isAiTool = !string.IsNullOrWhiteSpace(isAiToolVal) && bool.TryParse(isAiToolVal, out var aiParsed) && aiParsed;

                    var existingLessons = await _lessonRepository.GetAllAsync(q => q.Where(l =>
                        l.ModuleId == parentModule.Id && l.SubTopic.Equals(subTopic.Trim(), StringComparison.OrdinalIgnoreCase)));
                    var topic = existingLessons.FirstOrDefault();

                    var videoUrlsJson = !string.IsNullOrWhiteSpace(videoUrl)
                        ? System.Text.Json.JsonSerializer.Serialize(new List<string> { videoUrl })
                        : null;

                    if (topic == null)
                    {
                        topic = new Lesson
                        {
                            ModuleId = parentModule.Id,
                            SubTopic = subTopic.Trim(),
                            DisplayOrder = displayOrder,
                            SerialNumber = serialNumber,
                            TotalHours = totalHours,
                            ExpectedPeriods = expectedPeriods,
                            Activity = activity,
                            VideoUrl = videoUrl,
                            VideoUrls = videoUrlsJson,
                            DiagramUrl = diagramUrl,
                            PdfFileUrl = pdfFileUrl,
                            Source = source,
                            Procedure = procedure,
                            Code = code,
                            RequiredMaterial = requiredMaterial,
                            WhatYouGet = whatYouGet,
                            IsActivity = isActivity,
                            IsPythonActivity = isPython,
                            IsRoboticsActivity = isRobotics,
                            IsAiToolActivity = isAiTool,
                            BrowserUrl = browserUrl,
                            IsActive = isActive
                        };
                        await _lessonRepository.AddAsync(topic);
                    }
                    else
                    {
                        topic.DisplayOrder = displayOrder != 0 ? displayOrder : topic.DisplayOrder;
                        topic.SerialNumber = serialNumber != r ? serialNumber : topic.SerialNumber;
                        topic.TotalHours = totalHours != 0 ? totalHours : topic.TotalHours;
                        topic.ExpectedPeriods = expectedPeriods != 1 ? expectedPeriods : topic.ExpectedPeriods;
                        topic.Activity = activity ?? topic.Activity;
                        topic.VideoUrl = videoUrl ?? topic.VideoUrl;
                        topic.VideoUrls = videoUrlsJson ?? topic.VideoUrls;
                        topic.DiagramUrl = diagramUrl ?? topic.DiagramUrl;
                        topic.PdfFileUrl = pdfFileUrl ?? topic.PdfFileUrl;
                        topic.Source = source ?? topic.Source;
                        topic.Procedure = procedure ?? topic.Procedure;
                        topic.Code = code ?? topic.Code;
                        topic.RequiredMaterial = requiredMaterial ?? topic.RequiredMaterial;
                        topic.WhatYouGet = whatYouGet ?? topic.WhatYouGet;
                        topic.IsActivity = isActivity || topic.IsActivity;
                        topic.IsPythonActivity = isPython || topic.IsPythonActivity;
                        topic.IsRoboticsActivity = isRobotics || topic.IsRoboticsActivity;
                        topic.IsAiToolActivity = isAiTool || topic.IsAiToolActivity;
                        topic.BrowserUrl = browserUrl ?? topic.BrowserUrl;
                        topic.IsActive = isActive;
                        await _lessonRepository.UpdateAsync(topic);
                    }

                    if (schoolId != Guid.Empty)
                    {
                        var existingAssign = (await _topicAssignmentRepository.GetAllAsync(q =>
                            q.Where(a => a.SchoolId == schoolId && a.TopicId == topic.Id))).FirstOrDefault();
                        if (existingAssign == null)
                        {
                            await _topicAssignmentRepository.AddAsync(new SchoolTopicAssignment
                            {
                                SchoolId = schoolId,
                                TopicId = topic.Id,
                                AssignedBy = Guid.Empty,
                                AssignedDate = DateTime.UtcNow
                            });
                        }
                    }

                    importedCount++;
                }

                result.Success = result.Errors.Count == 0;
                result.ImportedCount = importedCount;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"General error parsing topics file: {ex.Message}");
            }
            return result;
        }

        private async Task<List<List<string>>> ParseStreamAsync(Stream stream)
        {
            using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            byte[] signature = new byte[4];
            int read = memoryStream.Read(signature, 0, 4);
            memoryStream.Position = 0;

            bool isExcel = read == 4 && 
                           signature[0] == 0x50 && 
                           signature[1] == 0x4B && 
                           signature[2] == 0x03 && 
                           signature[3] == 0x04;

            if (isExcel)
            {
                return ParseExcel(memoryStream);
            }
            else
            {
                return ParseCsv(memoryStream);
            }
        }

        private List<List<string>> ParseExcel(Stream stream)
        {
            var table = new List<List<string>>();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null) return table;

            var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
            var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

            for (int r = 1; r <= lastRow; r++)
            {
                var row = worksheet.Row(r);
                var rowValues = new List<string>();
                for (int c = 1; c <= lastCol; c++)
                {
                    var cellValue = row.Cell(c).GetString()?.Trim() ?? "";
                    rowValues.Add(cellValue);
                }
                table.Add(rowValues);
            }
            return table;
        }

        private List<List<string>> ParseCsv(Stream stream)
        {
            var table = new List<List<string>>();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                table.Add(ParseCsvLine(line));
            }
            return table;
        }

        private List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            var inQuotes = false;
            var currentField = new StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    // Handle double quotes inside quotes "" -> "
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        currentField.Append('"');
                        i++; // skip next quote
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(currentField.ToString().Trim());
                    currentField.Clear();
                }
                else
                {
                    currentField.Append(c);
                }
            }
            result.Add(currentField.ToString().Trim());
            return result;
        }

        private Dictionary<string, int> GetHeaders(List<string> row)
        {
            var headers = new Dictionary<string, int>();
            for (int i = 0; i < row.Count; i++)
            {
                var val = row[i].Trim().ToLower();
                if (!string.IsNullOrEmpty(val))
                {
                    headers[val] = i;
                }
            }
            return headers;
        }

        private string? GetVal(List<string> row, Dictionary<string, int> headers, params string[] names)
        {
            foreach (var name in names)
            {
                if (headers.TryGetValue(name.ToLower(), out var colIndex))
                {
                    if (colIndex < row.Count)
                    {
                        return row[colIndex];
                    }
                }
            }
            return null;
        }
    }
}
