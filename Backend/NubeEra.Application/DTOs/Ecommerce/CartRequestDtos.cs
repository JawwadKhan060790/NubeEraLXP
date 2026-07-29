using System;

namespace NubeEra.Application.DTOs;

public class CreateCartItemRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class UpdateCartItemQuantityRequest
{
    public int Quantity { get; set; }
}
