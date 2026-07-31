using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Services.Media;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;
using Veriton.Infrastructure.Persistence.DbContext;

namespace Veriton.Infrastructure.Services.Media;

public class UploadService : IUploadService
{
    private readonly AppDbContext _context;

    public UploadService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UploadedFile?> GetFileByIdAsync(Guid id)
    {
        return await _context.UploadedFiles.FindAsync(id);
    }

    public async Task<object> UploadFileAsync(IFormFile file, string contentRootPath)
    {
        if (file == null || file.Length == 0)
            throw new AppException("No file received.");

        var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            throw new AppException("Only PDF and image files are allowed.");

        var uploadsFolder = Path.Combine(contentRootPath, "wwwroot", "uploads");

        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/{fileName}";

        return new
        {
            url = fileUrl,
            fileName = fileName
        };
    }
}
