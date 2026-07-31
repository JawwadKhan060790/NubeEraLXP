using System;

namespace Veriton.Domain.Common;

/// <summary>
/// Thrown by the centralized GradeAccessService/SchoolGradeRangeService whenever a request
/// (regardless of role) tries to read or write data for a grade level that falls outside the
/// requesting user's school-configured grade range (FromGrade-ToGrade).
///
/// This is the single, application-wide "you may not see/touch this grade" signal — it
/// guarantees that even a manually-crafted API request supplying an out-of-range GradeId
/// or grade level results in a 403 Forbidden, never a silent 200 with leaked data.
/// </summary>
public class GradeAccessForbiddenException : Exception
{
    public GradeAccessForbiddenException()
        : base("Access to the requested grade is not permitted for your school's configured grade range.")
    {
    }

    public GradeAccessForbiddenException(string message) : base(message) { }
}
