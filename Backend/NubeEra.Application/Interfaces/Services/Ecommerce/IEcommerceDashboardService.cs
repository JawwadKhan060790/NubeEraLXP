using System.Threading.Tasks;

namespace NubeEra.Application.Interfaces.Services.Ecommerce;

public interface IEcommerceDashboardService
{
    Task<object> GetStatsAsync();
}
