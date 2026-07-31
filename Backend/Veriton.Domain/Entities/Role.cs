using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class Role : BaseEntity
{
    public string RoleName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}
