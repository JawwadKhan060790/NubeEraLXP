using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using NubeEra.Application.Common.Export;
using NubeEra.Application.Interfaces.Services.Export;

namespace NubeEra.Infrastructure.Services.Export;

/// <summary>
/// ClosedXML-backed implementation of <see cref="IExcelExportService"/> — the ONE
/// place workbook generation happens for the entire application. Every module
/// (Students, Teachers, Courses, future Reporting framework, …) routes through
/// this single service, satisfying the "no duplicate export implementations /
/// reusable framework" requirement.
///
/// Brand styling (header fill colour) intentionally mirrors the existing UI
/// primary brand blue (#2563EB) used across the frontend design system, so
/// exported workbooks visually match the product rather than looking bolted-on.
/// </summary>
public class ExcelExportService : IExcelExportService
{
    private const int MaxSheetNameLength = 31; // hard Excel limit
    private static readonly XLColor HeaderFill = XLColor.FromArgb(37, 99, 235);   // brand primary #2563EB
    private static readonly XLColor HeaderFont = XLColor.White;
    private static readonly XLColor BorderColor = XLColor.FromArgb(203, 213, 225); // neutral #CBD5E1

    public byte[] GenerateExcel(IEnumerable<IReadOnlyDictionary<string, object?>> rows, ExportConfiguration configuration)
    {
        if (configuration is null) throw new ArgumentNullException(nameof(configuration));

        var columns = configuration.Columns ?? new List<ExportColumnDefinition>();
        var materializedRows = (rows ?? Enumerable.Empty<IReadOnlyDictionary<string, object?>>()).ToList();

        using var workbook = new XLWorkbook();
        var sheetName = SanitizeSheetName(configuration.SheetName);
        var worksheet = workbook.Worksheets.Add(sheetName);

        var headerRowIndex = 1;
        var columnCount = Math.Max(columns.Count, 1);

        if (!string.IsNullOrWhiteSpace(configuration.Title))
        {
            var titleCell = worksheet.Cell(1, 1);
            titleCell.Value = configuration.Title;
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.FontSize = 14;
            titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;

            if (columnCount > 1)
            {
                worksheet.Range(1, 1, 1, columnCount).Merge();
            }

            headerRowIndex = 3;
        }

        for (var i = 0; i < columns.Count; i++)
        {
            var column = columns[i];
            var headerCell = worksheet.Cell(headerRowIndex, i + 1);
            headerCell.Value = column.Header ?? column.Key;
            headerCell.Style.Font.Bold = true;
            headerCell.Style.Fill.BackgroundColor = HeaderFill;
            headerCell.Style.Font.FontColor = HeaderFont;
            headerCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            headerCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            headerCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            headerCell.Style.Border.OutsideBorderColor = BorderColor;

            if (column.Width.HasValue && column.Width.Value > 0)
            {
                worksheet.Column(i + 1).Width = column.Width.Value;
            }
        }

        var rowIndex = headerRowIndex;
        foreach (var row in materializedRows)
        {
            rowIndex++;
            for (var i = 0; i < columns.Count; i++)
            {
                var column = columns[i];
                var cell = worksheet.Cell(rowIndex, i + 1);

                object? rawValue = null;
                row?.TryGetValue(column.Key, out rawValue);

                WriteCellValue(cell, rawValue, column);
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = BorderColor;
            }
        }

        if (columns.Count > 0)
        {
            var lastDataRow = Math.Max(rowIndex, headerRowIndex);
            var tableRange = worksheet.Range(headerRowIndex, 1, lastDataRow, columns.Count);
            tableRange.SetAutoFilter();
        }

        worksheet.SheetView.FreezeRows(headerRowIndex);

        if (columns.All(c => !c.Width.HasValue))
        {
            worksheet.Columns().AdjustToContents(1, Math.Max(rowIndex, headerRowIndex));
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static string SanitizeSheetName(string? sheetName)
    {
        var name = string.IsNullOrWhiteSpace(sheetName) ? "Sheet1" : sheetName.Trim();

        foreach (var invalidChar in new[] { '\\', '/', '*', '[', ']', ':', '?' })
        {
            name = name.Replace(invalidChar, ' ');
        }

        return name.Length > MaxSheetNameLength ? name.Substring(0, MaxSheetNameLength) : name;
    }

    private static void WriteCellValue(IXLCell cell, object? rawValue, ExportColumnDefinition column)
    {
        if (rawValue is null || rawValue is DBNull)
        {
            cell.Value = string.Empty;
            return;
        }

        switch (column.Type)
        {
            case ExportColumnType.Number:
            case ExportColumnType.Currency:
                if (TryToDouble(rawValue, out var numericValue))
                {
                    cell.Value = numericValue;
                    cell.Style.NumberFormat.Format = column.Format
                        ?? (column.Type == ExportColumnType.Currency ? "#,##0.00" : "#,##0.##");
                }
                else
                {
                    cell.Value = Convert.ToString(rawValue) ?? string.Empty;
                }
                break;

            case ExportColumnType.Date:
            case ExportColumnType.DateTime:
                if (TryToDateTime(rawValue, out var dateValue))
                {
                    cell.Value = dateValue;
                    cell.Style.NumberFormat.Format = column.Format
                        ?? (column.Type == ExportColumnType.Date ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm");
                }
                else
                {
                    cell.Value = Convert.ToString(rawValue) ?? string.Empty;
                }
                break;

            case ExportColumnType.Boolean:
                cell.Value = rawValue is bool boolValue
                    ? (boolValue ? "Yes" : "No")
                    : (Convert.ToString(rawValue) ?? string.Empty);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                break;

            case ExportColumnType.Text:
            default:
                cell.Value = Convert.ToString(rawValue) ?? string.Empty;
                break;
        }
    }

    private static bool TryToDouble(object value, out double result)
    {
        try
        {
            result = Convert.ToDouble(value);
            return true;
        }
        catch
        {
            result = 0;
            return false;
        }
    }

    private static bool TryToDateTime(object value, out DateTime result)
    {
        switch (value)
        {
            case DateTime dt:
                result = dt;
                return true;
            case DateTimeOffset dto:
                result = dto.DateTime;
                return true;
            default:
                return DateTime.TryParse(Convert.ToString(value), out result);
        }
    }
}
