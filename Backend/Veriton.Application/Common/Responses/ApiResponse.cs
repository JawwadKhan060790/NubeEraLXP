using System.Collections.Generic;

namespace Veriton.Application.Common.Responses;

/// <summary>
/// Global API response structure.
/// </summary>
/// <typeparam name="T">Type of payload data.</typeparam>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
    public int StatusCode { get; set; }
}
