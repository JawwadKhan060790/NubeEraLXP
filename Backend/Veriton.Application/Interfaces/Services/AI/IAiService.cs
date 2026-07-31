using System.Threading.Tasks;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services.AI;

public interface IAiService
{
    Task<string> ChatAsync(AIChatRequest request);
}
