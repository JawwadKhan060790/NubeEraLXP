using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Services.Ecommerce;
using Veriton.Domain.Entities;

namespace Veriton.API.Controllers.Ecommerce;

[ApiController]
[Route("api/ecommerce/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] bool? isAvailable,
        [FromQuery] string? brand,
        [FromQuery] string? tag,
        [FromQuery] string? schoolGrade,
        [FromQuery] bool? isFeatured,
        [FromQuery] bool? isTrending,
        [FromQuery] bool? isNewArrival,
        [FromQuery] string? sortBy)
    {
        var products = await _productService.GetProductsAsync(
            search, categoryId, minPrice, maxPrice, isAvailable, brand, tag, schoolGrade, isFeatured, isTrending, isNewArrival, sortBy);
        return Ok(products);
    }

    [HttpGet("admin")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetProductsAdmin()
    {
        var products = await _productService.GetProductsAdminAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound(new { message = "Product not found." });
        return Ok(product);
    }

    [HttpGet("{id}/related")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRelated(Guid id)
    {
        var related = await _productService.GetRelatedAsync(id);
        return Ok(related);
    }

    [HttpPost]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        var created = await _productService.CreateAsync(product);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Product updatedProduct)
    {
        var updated = await _productService.UpdateAsync(id, updatedProduct);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _productService.DeleteAsync(id);
        return Ok(new { message = "Product deleted successfully." });
    }
}
