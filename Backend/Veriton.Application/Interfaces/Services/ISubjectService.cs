using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Pagination;

namespace Veriton.Application.Interfaces.Services;

public interface ISubjectService : IGenericService<SubjectCreateDto, SubjectUpdateDto, SubjectDto>
{
    Task<PagedResponse<SubjectDto>> GetPagedAsync(PaginationRequest request);
    Task AssignTeachersAsync(Guid subjectId, List<Guid> teacherIds);
    Task AssignStudentsAsync(Guid subjectId, List<Guid> studentIds);
}
