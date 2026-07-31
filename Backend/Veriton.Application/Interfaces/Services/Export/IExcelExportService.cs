using System.Collections.Generic;
using Veriton.Application.Common.Export;

namespace Veriton.Application.Interfaces.Services.Export;

/// <summary>
/// Single, reusable workbook generator shared by every module's export action —
/// the "centralized reusable framework" requirement. Callers never touch a
/// spreadsheet library directly; they describe WHAT to export
/// (<see cref="ExportConfiguration"/>) and hand over already-authorized,
/// already-projected row data as plain key/value dictionaries (the same shape
/// each module already projects for its JSON list response, so existing
/// projections/queries/stored-procedure results can be reused as-is — no parallel
/// data-access path is introduced).
///
/// Authorization, role scoping (Admin/Principal/Staff/Teacher/Parent/Student),
/// filtering, and pagination intentionally stay OUTSIDE this service: those are
/// per-module concerns that already live in each module's existing service /
/// <see cref="Veriton.Application.Interfaces.Security.ICurrentUserService"/>
/// usage. This keeps the export engine a pure, side-effect-free formatter that
/// can never leak data a caller wasn't already authorized to fetch.
/// </summary>
public interface IExcelExportService
{
    /// <summary>
    /// Renders <paramref name="rows"/> into a single-sheet .xlsx workbook described by
    /// <paramref name="configuration"/> and returns the raw file bytes, ready to be
    /// returned via <c>File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName)</c>.
    /// </summary>
    /// <param name="rows">
    /// Row data, one dictionary per row, keyed by <see cref="ExportColumnDefinition.Key"/>.
    /// Missing keys render as blank cells; this keeps the engine forgiving of
    /// heterogeneous/optional fields across modules.
    /// </param>
    byte[] GenerateExcel(IEnumerable<IReadOnlyDictionary<string, object?>> rows, ExportConfiguration configuration);
}
