using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductTitle { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public decimal Price { get; set; }
    public int Quantity { get; set; }

    // Navigation Properties
    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
