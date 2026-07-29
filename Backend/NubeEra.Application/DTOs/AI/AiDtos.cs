namespace NubeEra.Application.DTOs;

public class AIChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public AIChatConfig? Config { get; set; }
}

public class AIChatConfig
{
    public string? Provider { get; set; }
    public string? Model { get; set; }
    public string? ApiKey { get; set; }
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
}
