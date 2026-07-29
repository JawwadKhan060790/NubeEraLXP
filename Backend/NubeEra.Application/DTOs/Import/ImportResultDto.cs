using System.Collections.Generic;

namespace NubeEra.Application.DTOs
{
    public class ImportResultDto
    {
        public bool Success { get; set; }
        public int ImportedCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
