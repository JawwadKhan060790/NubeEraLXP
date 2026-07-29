using System.Threading.Tasks;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services.AI;

public interface IAiService
{
    Task<string> ChatAsync(AIChatRequest request);
}
