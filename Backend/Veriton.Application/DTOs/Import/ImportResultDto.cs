using System.Collections.Generic;

namespace Veriton.Application.DTOs
{
    public class ImportResultDto
    {
        public bool Success { get; set; }
        public int ImportedCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
