using System.Threading.Tasks;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IParentService
{
    Task<ParentDashboardDto> GetParentDashboardAsync(string? statusFilter = null);
}
