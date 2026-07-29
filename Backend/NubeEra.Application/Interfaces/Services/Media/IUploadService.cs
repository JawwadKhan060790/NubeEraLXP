using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Services.Media;

public interface IUploadService
{
    Task<UploadedFile?> GetFileByIdAsync(Guid id);
    Task<object> UploadFileAsync(IFormFile file, string contentRootPath);
}
