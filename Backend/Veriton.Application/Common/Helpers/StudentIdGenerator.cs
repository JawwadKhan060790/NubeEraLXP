using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Domain.Entities;

namespace Veriton.Application.Common.Helpers;

public static class StudentIdGenerator
{
    private static readonly HashSet<string> StructuralFillers = new(StringComparer.OrdinalIgnoreCase)
    {
        "school", "academy", "institute", "college", "high", "public", "the", "of", "and", "in"
    };

    /// <summary>
    /// Generates short school initials (e.g. "Dar-Al-Arqam Public School" -> "DA").
    /// </summary>
    public static string DeriveSchoolInitials(string? schoolName, string? schoolCode = null)
    {
        if (!string.IsNullOrWhiteSpace(schoolCode) && schoolCode.Trim().Length <= 4 && !schoolCode.StartsWith("SCH", StringComparison.OrdinalIgnoreCase))
        {
            return schoolCode.Trim().ToUpperInvariant();
        }

        if (string.IsNullOrWhiteSpace(schoolName))
            return "STU";

        var words = schoolName.Split(new[] { ' ', '-', '.', ',', '&', '/' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => !StructuralFillers.Contains(w.Trim()))
            .ToList();

        if (!words.Any())
        {
            words = schoolName.Split(new[] { ' ', '-', '.', ',', '&', '/' }, StringSplitOptions.RemoveEmptyEntries).ToList();
        }

        if (!words.Any())
            return "STU";

        if (words.Count >= 2)
        {
            var firstChar = char.ToUpperInvariant(words[0][0]);
            var secondChar = char.ToUpperInvariant(words[1][0]);
            return $"{firstChar}{secondChar}";
        }
        else
        {
            var word = words[0];
            if (word.Length >= 2)
                return word.Substring(0, 2).ToUpperInvariant();
            return word.ToUpperInvariant();
        }
    }

    /// <summary>
    /// Generates next unique student ID for a school in current year, formatted as {Initials}-{YY}{Sequence:D4}
    /// (e.g. "DA-260005" if 4 students exist for Dar-Al-Arqam Public School).
    /// </summary>
    public static async Task<string> GenerateNextStudentIdAsync(
        Guid schoolId,
        IGenericRepository<School> schoolRepository,
        IGenericRepository<Student> studentRepository)
    {
        var school = await schoolRepository.GetByIdAsync(schoolId);
        var schoolName = school?.Name ?? "School";
        var schoolCode = school?.SchoolCode;

        var initials = DeriveSchoolInitials(schoolName, schoolCode);
        var year = DateTime.UtcNow.ToString("yy");
        var prefix = $"{initials}-{year}"; // e.g. "DA-26"

        var existingIds = await studentRepository.Query()
            .AsNoTracking()
            .Where(s => s.SchoolId == schoolId && s.StudentId != null && s.StudentId.StartsWith(prefix))
            .Select(s => s.StudentId!)
            .ToListAsync();

        int maxSeq = 0;
        foreach (var id in existingIds)
        {
            var suffix = id.Substring(prefix.Length);
            if (int.TryParse(suffix, out int seq))
            {
                if (seq > maxSeq) maxSeq = seq;
            }
        }

        // Count total registered students for this school as base sequence if higher
        var totalSchoolStudents = await studentRepository.CountAsync(q => q.Where(s => s.SchoolId == schoolId && s.IsActive));
        if (maxSeq < totalSchoolStudents)
        {
            maxSeq = totalSchoolStudents;
        }

        int nextSeq = maxSeq + 1;
        string generatedId = $"{prefix}{nextSeq:D4}";

        while (await studentRepository.CountAsync(q => q.Where(s => s.SchoolId == schoolId && s.StudentId == generatedId)) > 0)
        {
            nextSeq++;
            generatedId = $"{prefix}{nextSeq:D4}";
        }

        return generatedId;
    }
}
