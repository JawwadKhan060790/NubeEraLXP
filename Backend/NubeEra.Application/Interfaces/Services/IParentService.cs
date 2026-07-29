using System.Threading.Tasks;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

public interface IParentService
{
    Task<ParentDashboardDto> GetParentDashboardAsync(string? statusFilter = null);
}
