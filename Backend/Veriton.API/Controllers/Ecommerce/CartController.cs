using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;

namespace Veriton.API.Controllers.Ecommerce;

[ApiController]
[Route("api/ecommerce/cart")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var result = await _cartService.GetCartAsync();
        return Ok(result);
    }

    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] CreateCartItemRequest request)
    {
        await _cartService.AddToCartAsync(request);
        return Ok(new { message = "Product added to cart successfully." });
    }

    [HttpPut("{id}/quantity")]
    public async Task<IActionResult> UpdateQuantity(Guid id, [FromBody] UpdateCartItemQuantityRequest request)
    {
        await _cartService.UpdateQuantityAsync(id, request);
        return Ok(new { message = "Cart updated successfully." });
    }

    [HttpPut("{id}/save-for-later")]
    public async Task<IActionResult> ToggleSaveForLater(Guid id, [FromQuery] bool save)
    {
        await _cartService.ToggleSaveForLaterAsync(id, save);
        return Ok(new { message = save ? "Item saved for later." : "Item moved back to cart." });
    }

    [HttpPost("{id}/move-to-wishlist")]
    public async Task<IActionResult> MoveToWishlist(Guid id)
    {
        await _cartService.MoveToWishlistAsync(id);
        return Ok(new { message = "Item moved to wishlist successfully." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(Guid id)
    {
        await _cartService.RemoveFromCartAsync(id);
        return Ok(new { message = "Item removed from cart successfully." });
    }

    [HttpDelete("clear")]
    public async Task<IActionResult> Clear()
    {
        await _cartService.ClearCartAsync();
        return Ok(new { message = "Cart cleared successfully." });
    }
}

