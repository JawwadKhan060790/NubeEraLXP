using System.Threading.Tasks;

namespace Veriton.Application.Interfaces.Services.Ecommerce;

public interface IEcommerceDashboardService
{
    Task<object> GetStatsAsync();
}
