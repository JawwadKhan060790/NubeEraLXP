using System.Collections.Generic;

namespace NubeEra.Application.Common.Export;

/// <summary>
/// Full description of one generated workbook: file/sheet naming, an optional
/// title banner, and the ordered column metadata. A single
/// <see cref="IExcelExportService"/> implementation consumes this for every
/// module — Students, Teachers, Courses, etc. — so no module hand-rolls its own
/// export/report engine (the explicit "no duplicate export implementations"
/// requirement).
/// </summary>
public class ExportConfiguration
{
    /// <summary>Download file name WITHOUT extension — ".xlsx" is appended by the export service/controller.</summary>
    public string FileName { get; set; } = "export";

    /// <summary>Worksheet tab name (Excel caps this at 31 characters; the service truncates defensively).</summary>
    public string SheetName { get; set; } = "Sheet1";

    /// <summary>Optional banner row merged across all columns above the header row (e.g. "Students — Greenwood Campus").</summary>
    public string? Title { get; set; }

    /// <summary>Ordered column definitions — column order in the workbook matches list order.</summary>
    public List<ExportColumnDefinition> Columns { get; set; } = new();

    public static ExportConfiguration Create(string fileName, string sheetName, IEnumerable<ExportColumnDefinition> columns, string? title = null)
        => new()
        {
            FileName = fileName,
            SheetName = sheetName,
            Title = title,
            Columns = new List<ExportColumnDefinition>(columns)
        };
}
