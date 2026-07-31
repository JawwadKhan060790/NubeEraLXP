using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Veriton.Application.Interfaces.Services.Ecommerce;

public interface IWishlistService
{
    Task<List<object>> GetWishlistAsync();
    Task AddToWishlistAsync(Guid productId);
    Task MoveToCartAsync(Guid itemId);
    Task RemoveFromWishlistAsync(Guid itemId);
}
