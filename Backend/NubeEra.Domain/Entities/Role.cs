using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class Role : BaseEntity
{
    public string RoleName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}
