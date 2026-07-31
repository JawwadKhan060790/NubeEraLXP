using System;
using System.Collections.Generic;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class ProductCategory : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    [System.Text.Json.Serialization.JsonIgnore]
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
