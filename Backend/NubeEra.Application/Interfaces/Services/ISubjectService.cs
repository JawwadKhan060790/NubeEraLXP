using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Pagination;

namespace NubeEra.Application.Interfaces.Services;

public interface ISubjectService : IGenericService<SubjectCreateDto, SubjectUpdateDto, SubjectDto>
{
    Task<PagedResponse<SubjectDto>> GetPagedAsync(PaginationRequest request);
    Task AssignTeachersAsync(Guid subjectId, List<Guid> teacherIds);
    Task AssignStudentsAsync(Guid subjectId, List<Guid> studentIds);
}
