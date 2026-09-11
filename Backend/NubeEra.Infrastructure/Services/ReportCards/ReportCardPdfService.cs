using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QRCoder;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services.ReportCards;

namespace NubeEra.Infrastructure.Services.ReportCards;

/// <summary>
/// Generates a premium, A4 report card PDF using QuestPDF.
/// Design: Deep Blue + Purple + Gold on white — matches the app brand palette.
/// </summary>
public class ReportCardPdfService : IReportCardPdfService
{
    // ── Palette ──────────────────────────────────────────────────────────────
    private static readonly string DeepBlue   = "#1E3A8A";
    private static readonly string Purple     = "#6D28D9";
    private static readonly string Gold       = "#D4AF37";
    private static readonly string LightBlue  = "#EFF6FF";
    private static readonly string LightGold  = "#FFFBEB";
    private static readonly string TextDark   = "#1F2937";
    private static readonly string TextMuted  = "#6B7280";
    private static readonly string White      = "#FFFFFF";
    private static readonly string BorderGray = "#E5E7EB";
    private static readonly string PassGreen  = "#16A34A";
    private static readonly string FailRed    = "#DC2626";

    public ReportCardPdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ── QR Code ──────────────────────────────────────────────────────────────

    public string GenerateQrCodeBase64(string url)
    {
        using var gen = new QRCodeGenerator();
        var data = gen.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qr = new PngByteQRCode(data);
        return $"data:image/png;base64,{Convert.ToBase64String(qr.GetGraphic(6))}";
    }

    private byte[] GenerateQrBytes(string url)
    {
        using var gen = new QRCodeGenerator();
        var data = gen.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qr = new PngByteQRCode(data);
        return qr.GetGraphic(6);
    }

    // ── Color helper ─────────────────────────────────────────────────────────

    private static QuestPDF.Infrastructure.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex[..2], 16);
        var g = Convert.ToByte(hex[2..4], 16);
        var b = Convert.ToByte(hex[4..6], 16);
        return QuestPDF.Infrastructure.Color.FromRGB(r, g, b);
    }

    // ── Main PDF Generator ───────────────────────────────────────────────────

    public byte[] GeneratePdf(ReportCardDto rc)
    {
        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9).FontColor(Hex(TextDark)));
                page.Background().Background(Hex(White));

                page.Content().Column(col =>
                {
                    // ── Top accent bar ────────────────────────────────────
                    col.Item().Height(6).Background(Hex(DeepBlue));
                    col.Item().Height(3).Background(Hex(Gold));

                    col.Item().Padding(24).Column(inner =>
                    {
                        // ── HEADER ────────────────────────────────────────
                        inner.Item().Row(header =>
                        {
                            // School logo placeholder / initials
                            header.ConstantItem(80).Height(80).Background(Hex(DeepBlue))
                                .AlignCenter().AlignMiddle()
                                .Text(rc.SchoolName.Length > 2
                                    ? rc.SchoolName[..2].ToUpper()
                                    : rc.SchoolName.ToUpper())
                                .Bold().FontSize(28).FontColor(Hex(Gold));

                            header.RelativeItem().PaddingLeft(16).Column(c =>
                            {
                                c.Item().Text(rc.SchoolName)
                                    .Bold().FontSize(20).FontColor(Hex(DeepBlue));
                                if (!string.IsNullOrWhiteSpace(rc.SchoolAddress))
                                    c.Item().Text(rc.SchoolAddress).FontSize(8).FontColor(Hex(TextMuted));
                                if (!string.IsNullOrWhiteSpace(rc.SchoolContact))
                                    c.Item().Text(rc.SchoolContact).FontSize(8).FontColor(Hex(TextMuted));
                                c.Item().PaddingTop(4)
                                    .Text("STUDENT REPORT CARD")
                                    .Bold().FontSize(11).FontColor(Hex(Purple)).LetterSpacing(2);
                            });

                            // QR Code
                            if (!string.IsNullOrWhiteSpace(rc.QrCodeData))
                            {
                                try
                                {
                                    var qrBytes = GenerateQrBytes(rc.QrCodeData);
                                    header.ConstantItem(75).Height(75).Image(qrBytes, ImageScaling.FitArea);
                                }
                                catch { /* skip QR if generation fails */ }
                            }
                        });

                        // ── Divider with gold accent ──────────────────────
                        inner.Item().PaddingVertical(10).Row(div =>
                        {
                            div.RelativeItem(3).Height(2).Background(Hex(DeepBlue));
                            div.RelativeItem(1).Height(2).Background(Hex(Gold));
                        });

                        // ── Meta badges row ───────────────────────────────
                        inner.Item().Row(meta =>
                        {
                            BadgePill(meta, "Academic Year", rc.AcademicYear, DeepBlue, White);
                            meta.ConstantItem(8);
                            BadgePill(meta, "Exam", rc.ExamName ?? rc.ExamType, Purple, White);
                            meta.ConstantItem(8);
                            BadgePill(meta, "Report No.", rc.ReportCardNumber, Gold, TextDark);
                            meta.RelativeItem();
                        });

                        inner.Item().PaddingTop(12);

                        // ── Student + Examination Info (2-col) ────────────
                        inner.Item().Row(info =>
                        {
                            // Student info card
                            info.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                            {
                                c.Item().Background(Hex(DeepBlue)).Padding(6)
                                    .Text("STUDENT INFORMATION").Bold().FontSize(8)
                                    .FontColor(Hex(White)).LetterSpacing(1);
                                c.Item().Padding(8).Column(rows =>
                                {
                                    InfoRow(rows, "Student Name",    rc.StudentName);
                                    InfoRow(rows, "Student ID",      rc.StudentIdNumber);
                                    if (!string.IsNullOrWhiteSpace(rc.RollNo))
                                        InfoRow(rows, "Roll No.",    rc.RollNo!);
                                    InfoRow(rows, "Grade / Class",   rc.GradeName + (rc.Section != null ? $" - {rc.Section}" : ""));
                                     if (rc.DateOfBirth.HasValue)
                                         InfoRow(rows, "Date of Birth", rc.DateOfBirth.Value.ToString("dd/MM/yyyy"));
                                    if (!string.IsNullOrWhiteSpace(rc.ParentName))
                                        InfoRow(rows, "Parent / Guardian", rc.ParentName!);
                                    if (!string.IsNullOrWhiteSpace(rc.ParentContact))
                                        InfoRow(rows, "Contact",     rc.ParentContact!);
                                });
                            });

                            info.ConstantItem(10);

                            // Exam + attendance info card
                            info.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                            {
                                c.Item().Background(Hex(Purple)).Padding(6)
                                    .Text("EXAMINATION DETAILS").Bold().FontSize(8)
                                    .FontColor(Hex(White)).LetterSpacing(1);
                                c.Item().Padding(8).Column(rows =>
                                {
                                    InfoRow(rows, "Exam Type",       rc.ExamType);
                                    if (!string.IsNullOrWhiteSpace(rc.ExamName))
                                        InfoRow(rows, "Exam Name",   rc.ExamName!);
                                    if (rc.ExamDate.HasValue)
                                        InfoRow(rows, "Exam Date",   rc.ExamDate.Value.ToString("dd MMM yyyy"));
                                    InfoRow(rows, "Total Marks",     rc.TotalMarks.ToString("F0"));
                                    InfoRow(rows, "Obtained Marks",  rc.ObtainedMarks.ToString("F1"));
                                    InfoRow(rows, "Percentage",      $"{rc.Percentage:F2}%");
                                    if (rc.Rank.HasValue)
                                        InfoRow(rows, "Class Rank",  rc.Rank.Value.ToString());
                                    rows.Item().PaddingTop(4).Row(r =>
                                    {
                                        r.AutoItem().Text("Result: ").Bold().FontSize(9);
                                        r.AutoItem().Text(rc.IsPassed ? "PASSED" : "FAILED")
                                            .Bold().FontSize(9)
                                            .FontColor(rc.IsPassed ? Hex(PassGreen) : Hex(FailRed));
                                    });
                                });
                            });
                        });

                        inner.Item().PaddingTop(12);

                        // ── Subject Performance Table ─────────────────────
                        if (rc.Subjects.Any())
                        {
                            SectionHeader(inner, "SUBJECT PERFORMANCE", DeepBlue);
                            inner.Item().Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.ConstantColumn(20);   // #
                                    c.RelativeColumn(4);    // Subject
                                    c.RelativeColumn(1.5f); // Max
                                    c.RelativeColumn(1.5f); // Obtained
                                    c.RelativeColumn(1);    // Grade
                                    c.RelativeColumn(2);    // Remarks
                                });

                                // Header row
                                TableHeaderCell(table, "#");
                                TableHeaderCell(table, "Subject");
                                TableHeaderCell(table, "Max Marks");
                                TableHeaderCell(table, "Obtained");
                                TableHeaderCell(table, "Grade");
                                TableHeaderCell(table, "Remarks");

                                // Data rows
                                var subjects = rc.Subjects.OrderBy(s => s.SortOrder).ToList();
                                for (var i = 0; i < subjects.Count; i++)
                                {
                                    var s = subjects[i];
                                    var bg = i % 2 == 0 ? White : LightBlue;
                                    TableDataCell(table, (i + 1).ToString(), bg, center: true);
                                    TableDataCell(table, s.SubjectName, bg);
                                    TableDataCell(table, s.MaxMarks.ToString(), bg, center: true);
                                    TableDataCell(table, s.ObtainedMarks.ToString("F1"), bg, center: true);
                                    TableDataCell(table, s.Grade ?? "-", bg, center: true,
                                        bold: true,
                                        color: s.Grade == "F" ? FailRed : DeepBlue);
                                    TableDataCell(table, s.Remarks ?? "-", bg);
                                }

                                // Totals row
                                TableDataCell(table, "", LightGold);
                                TableDataCell(table, "TOTAL", LightGold, bold: true);
                                TableDataCell(table, rc.TotalMarks.ToString("F0"), LightGold, center: true, bold: true);
                                TableDataCell(table, rc.ObtainedMarks.ToString("F1"), LightGold, center: true, bold: true);
                                TableDataCell(table, rc.OverallGrade ?? "-", LightGold, center: true, bold: true,
                                    color: rc.IsPassed ? DeepBlue : FailRed);
                                TableDataCell(table, $"{rc.Percentage:F2}%", LightGold, center: true, bold: true);
                            });
                        }

                        inner.Item().PaddingTop(12);

                        // ── Performance Summary strip ─────────────────────
                        inner.Item().Background(Hex(DeepBlue)).Padding(10).Row(sumRow =>
                        {
                            SummaryChip(sumRow, "Total Marks",   rc.TotalMarks.ToString("F0"));
                            SummaryChip(sumRow, "Obtained",      rc.ObtainedMarks.ToString("F1"));
                            SummaryChip(sumRow, "Percentage",    $"{rc.Percentage:F2}%");
                            SummaryChip(sumRow, "Grade",         rc.OverallGrade ?? "-");
                            if (rc.GPA.HasValue)
                                SummaryChip(sumRow, "GPA",       rc.GPA.Value.ToString("F2"));
                            SummaryChip(sumRow, "Result",        rc.IsPassed ? "PASS" : "FAIL",
                                boldColor: rc.IsPassed ? Gold : "#FF6B6B");
                        });

                        inner.Item().PaddingTop(12);

                        // ── Attendance + Activities + Skills (3-col) ──────
                        inner.Item().Row(bottomRow =>
                        {
                            // Attendance
                            bottomRow.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                            {
                                c.Item().Background(Hex(Purple)).Padding(5)
                                    .Text("ATTENDANCE").Bold().FontSize(8)
                                    .FontColor(Hex(White)).LetterSpacing(1);
                                c.Item().Padding(8).Column(rows =>
                                {
                                    InfoRow(rows, "Working Days", rc.TotalWorkingDays?.ToString() ?? "-");
                                    InfoRow(rows, "Days Present", rc.DaysPresent?.ToString() ?? "-");
                                    InfoRow(rows, "Days Absent",  rc.DaysAbsent?.ToString() ?? "-");
                                    if (rc.AttendancePercentage.HasValue)
                                    {
                                        rows.Item().PaddingTop(4);
                                        var attColor = rc.AttendancePercentage >= 75 ? PassGreen : FailRed;
                                        rows.Item().Row(r =>
                                        {
                                            r.AutoItem().Text("Attendance: ").Bold().FontSize(9);
                                            r.AutoItem().Text($"{rc.AttendancePercentage:F1}%")
                                                .Bold().FontSize(9).FontColor(Hex(attColor));
                                        });
                                    }
                                });
                            });

                            bottomRow.ConstantItem(8);

                            // Co-curricular activities
                            if (rc.Activities.Any())
                            {
                                bottomRow.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                                {
                                    c.Item().Background(Hex("#0891B2")).Padding(5)
                                        .Text("CO-CURRICULAR ACTIVITIES").Bold().FontSize(7)
                                        .FontColor(Hex(White)).LetterSpacing(1);
                                    c.Item().Padding(8).Column(rows =>
                                    {
                                        foreach (var act in rc.Activities.OrderBy(a => a.SortOrder))
                                        {
                                            rows.Item().PaddingBottom(3).Row(r =>
                                            {
                                                r.RelativeItem().Text(act.ActivityName).FontSize(8);
                                                r.AutoItem().Text(act.Rating ?? "-").Bold().FontSize(8)
                                                    .FontColor(Hex(act.Rating == "Excellent" ? PassGreen : TextMuted));
                                            });
                                        }
                                    });
                                });

                                bottomRow.ConstantItem(8);
                            }

                            // Skills
                            if (rc.Skills.Any())
                            {
                                bottomRow.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                                {
                                    c.Item().Background(Hex(Gold)).Padding(5)
                                        .Text("SKILLS EVALUATION").Bold().FontSize(8)
                                        .FontColor(Hex(TextDark)).LetterSpacing(1);
                                    c.Item().Padding(8).Column(rows =>
                                    {
                                        foreach (var sk in rc.Skills.OrderBy(s => s.SortOrder))
                                        {
                                            rows.Item().PaddingBottom(4).Column(sr =>
                                            {
                                                sr.Item().Row(r =>
                                                {
                                                    r.RelativeItem().Text(sk.SkillName).FontSize(8);
                                                    r.AutoItem().Text($"{sk.Rating}/5").Bold().FontSize(8)
                                                        .FontColor(Hex(DeepBlue));
                                                });
                                                // Star-like rating bar
                                                sr.Item().Height(4).Row(bar =>
                                                {
                                                    for (var j = 0; j < 5; j++)
                                                    {
                                                        bar.RelativeItem()
                                                            .Background(j < sk.Rating ? Hex(DeepBlue) : Hex(BorderGray))
                                                            .Height(4);
                                                        if (j < 4) bar.ConstantItem(2);
                                                    }
                                                });
                                            });
                                        }
                                    });
                                });
                            }
                        });

                        inner.Item().PaddingTop(12);

                        // ── Remarks section ───────────────────────────────
                        if (!string.IsNullOrWhiteSpace(rc.TeacherRemarks) ||
                            !string.IsNullOrWhiteSpace(rc.PrincipalRemarks))
                        {
                            inner.Item().Row(remarks =>
                            {
                                if (!string.IsNullOrWhiteSpace(rc.TeacherRemarks))
                                {
                                    remarks.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                                    {
                                        c.Item().Background(Hex(DeepBlue)).Padding(5)
                                            .Text("TEACHER'S REMARKS").Bold().FontSize(8)
                                            .FontColor(Hex(White)).LetterSpacing(1);
                                        c.Item().Padding(8).Text(rc.TeacherRemarks).FontSize(8).Italic();
                                        c.Item().PaddingHorizontal(8).PaddingBottom(8).Column(sig =>
                                        {
                                            sig.Item().PaddingTop(12).BorderBottom(1).BorderColor(Hex(TextMuted)).Width(80);
                                            sig.Item().PaddingTop(2).Text("Class Teacher Signature").FontSize(7).FontColor(Hex(TextMuted));
                                        });
                                    });

                                    remarks.ConstantItem(10);
                                }

                                if (!string.IsNullOrWhiteSpace(rc.PrincipalRemarks))
                                {
                                    remarks.RelativeItem().Border(1).BorderColor(Hex(BorderGray)).Column(c =>
                                    {
                                        c.Item().Background(Hex(Purple)).Padding(5)
                                            .Text("PRINCIPAL'S REMARKS").Bold().FontSize(8)
                                            .FontColor(Hex(White)).LetterSpacing(1);
                                        c.Item().Padding(8).Text(rc.PrincipalRemarks).FontSize(8).Italic();
                                        c.Item().PaddingHorizontal(8).PaddingBottom(8).Column(sig =>
                                        {
                                            sig.Item().PaddingTop(12).BorderBottom(1).BorderColor(Hex(TextMuted)).Width(80);
                                            sig.Item().PaddingTop(2).Text("Principal Signature").FontSize(7).FontColor(Hex(TextMuted));
                                        });
                                    });
                                }
                            });

                            inner.Item().PaddingTop(12);
                        }

                        // ── Signature row ─────────────────────────────────
                        inner.Item().PaddingTop(8).Row(sigRow =>
                        {
                            SignatureBlock(sigRow, "Class Teacher");
                            sigRow.RelativeItem();
                            SignatureBlock(sigRow, "Principal");
                            sigRow.RelativeItem();
                            SignatureBlock(sigRow, "School Stamp");
                        });
                    });

                    // ── Bottom bar ────────────────────────────────────────
                    page.Footer().Column(foot =>
                    {
                        foot.Item().Height(2).Background(Hex(Gold));
                        foot.Item().Background(Hex(DeepBlue)).PaddingHorizontal(24).PaddingVertical(6).Row(f =>
                        {
                            f.RelativeItem().Text($"Report Card No: {rc.ReportCardNumber}")
                                .FontSize(7).FontColor(Hex(White));
                            f.RelativeItem().AlignCenter()
                                .Text("This is a computer-generated report card.")
                                .FontSize(7).FontColor(Hex(White)).Italic();
                            f.RelativeItem().AlignRight()
                                .Text($"Generated: {DateTime.UtcNow:dd MMM yyyy}")
                                .FontSize(7).FontColor(Hex(White));
                        });
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }

    // ── Layout helpers ────────────────────────────────────────────────────────

    private static void BadgePill(RowDescriptor row, string label, string value, string bg, string fg)
    {
        row.AutoItem().Background(Hex(bg)).PaddingHorizontal(8).PaddingVertical(4).Column(c =>
        {
            c.Item().Text(label).FontSize(7).FontColor(Hex(fg)).Italic();
            c.Item().Text(value).Bold().FontSize(9).FontColor(Hex(fg));
        });
    }

    private static void SectionHeader(ColumnDescriptor col, string text, string bgColor)
    {
        col.Item().Background(Hex(bgColor)).PaddingHorizontal(8).PaddingVertical(5).Row(r =>
        {
            r.AutoItem().Text(text).Bold().FontSize(9).FontColor(Hex(White)).LetterSpacing(1);
        });
    }

    private static void InfoRow(ColumnDescriptor col, string label, string value)
    {
        col.Item().PaddingBottom(3).Row(r =>
        {
            r.ConstantItem(95).Text(label + ":").FontSize(8).FontColor(Hex(TextMuted));
            r.RelativeItem().Text(value).Bold().FontSize(8);
        });
    }

    private static void TableHeaderCell(TableDescriptor table, string text)
    {
        table.Header(h => h.Cell().Background(Hex(DeepBlue)).Padding(5)
            .AlignCenter().Text(text).Bold().FontSize(8).FontColor(Hex(White)));
    }

    private static void TableDataCell(TableDescriptor table, string text, string bg,
        bool center = false, bool bold = false, string? color = null)
    {
        table.Cell().Background(Hex(bg)).BorderBottom(1).BorderColor(Hex(BorderGray))
            .Padding(5).Element(e =>
            {
                var t = e.Text(text).FontSize(8);
                if (bold) t.Bold();
                if (color != null) t.FontColor(Hex(color));
                if (center) e.AlignCenter();
            });
    }

    private static void SummaryChip(RowDescriptor row, string label, string value,
        string? boldColor = null)
    {
        row.AutoItem().PaddingRight(16).Column(c =>
        {
            c.Item().Text(label).FontSize(7).FontColor(Hex("#93C5FD"));
            var t = c.Item().Text(value).Bold().FontSize(11);
            t.FontColor(boldColor != null ? Hex(boldColor) : Hex(Gold));
        });
    }

    private static void SignatureBlock(RowDescriptor row, string label)
    {
        row.AutoItem().Column(c =>
        {
            c.Item().Width(90).BorderBottom(1).BorderColor(Hex(TextMuted)).Height(28);
            c.Item().PaddingTop(3).Text(label).FontSize(8).FontColor(Hex(TextMuted)).AlignCenter();
        });
    }


}
