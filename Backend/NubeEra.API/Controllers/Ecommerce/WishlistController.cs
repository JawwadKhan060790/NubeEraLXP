using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.Interfaces.Services.Ecommerce;

namespace NubeEra.API.Controllers.Ecommerce;

[ApiController]
[Route("api/ecommerce/wishlist")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly IWishlistService _wishlistService;

    public WishlistController(IWishlistService wishlistService)
    {
        _wishlistService = wishlistService;
    }

    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        var items = await _wishlistService.GetWishlistAsync();
        return Ok(items);
    }

    public class AddToWishlistRequest
    {
        public Guid ProductId { get; set; }
    }

    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] AddToWishlistRequest request)
    {
        await _wishlistService.AddToWishlistAsync(request.ProductId);
        return Ok(new { message = "Product added to wishlist successfully." });
    }

    [HttpPost("{id}/move-to-cart")]
    public async Task<IActionResult> MoveToCart(Guid id)
    {
        await _wishlistService.MoveToCartAsync(id);
        return Ok(new { message = "Item moved to cart successfully." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(Guid id)
    {
        await _wishlistService.RemoveFromWishlistAsync(id);
        return Ok(new { message = "Item removed from wishlist successfully." });
    }
}
