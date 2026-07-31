using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Veriton.Domain.Entities;

namespace Veriton.Application.Interfaces.Services.Media;

public interface IUploadService
{
    Task<UploadedFile?> GetFileByIdAsync(Guid id);
    Task<object> UploadFileAsync(IFormFile file, string contentRootPath);
}
