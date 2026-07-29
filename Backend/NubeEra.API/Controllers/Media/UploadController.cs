using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.Interfaces.Services.Media;

namespace NubeEra.API.Controllers.Media;

[ApiController]
[Route("api/upload")]
public class UploadController : ControllerBase
{
    private readonly IUploadService _uploadService;
    private readonly IWebHostEnvironment _env;

    public UploadController(IUploadService uploadService, IWebHostEnvironment env)
    {
        _uploadService = uploadService;
        _env = env;
    }

    public class FileUploadRequest
    {
        public IFormFile File { get; set; } = null!;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    public async Task<IActionResult> Upload([FromForm] FileUploadRequest request)
    {
        var result = await _uploadService.UploadFileAsync(request.File, _env.ContentRootPath);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var file = await _uploadService.GetFileByIdAsync(id);

        if (file == null)
            return NotFound();

        return File(file.Data, file.ContentType, enableRangeProcessing: true);
    }
}
