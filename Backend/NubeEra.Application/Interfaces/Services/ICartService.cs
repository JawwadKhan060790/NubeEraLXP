using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

public interface ICartService
{
    Task<CartResponseDto> GetCartAsync();
    Task AddToCartAsync(CreateCartItemRequest request);
    Task UpdateQuantityAsync(Guid itemId, UpdateCartItemQuantityRequest request);
    Task ToggleSaveForLaterAsync(Guid itemId, bool save);
    Task MoveToWishlistAsync(Guid itemId);
    Task RemoveFromCartAsync(Guid itemId);
    Task ClearCartAsync();
}
