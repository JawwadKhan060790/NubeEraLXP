using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QRCoder;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services.Certificates;

namespace NubeEra.Infrastructure.Services.Certificates;

/// <summary>
/// Generates print-ready A4 certificate PDFs using QuestPDF.
/// Grade-wise design variants:
///   1-3  → Fun / colourful (Gold + Coral accents)
///   4-6  → Creative STEM (Blue + Teal)
///   7-8  → Modern Academic (Deep Blue + Silver)
///   9-10 → Premium Professional (Deep Blue + Gold)
/// </summary>
public class CertificatePdfService : ICertificatePdfService
{
    public CertificatePdfService()
    {
        // QuestPDF community licence — free for open-source / internal tools.
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ── QR Code ─────────────────────────────────────────────────────────────

    public string GenerateQrCodeBase64(string verificationUrl)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(verificationUrl, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var pngBytes = qrCode.GetGraphic(6);
        return $"data:image/png;base64,{Convert.ToBase64String(pngBytes)}";
    }

    private byte[] GenerateQrCodeBytes(string verificationUrl)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(verificationUrl, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        return qrCode.GetGraphic(6);
    }

    // ── Color Scheme ─────────────────────────────────────────────────────────

    private record ColorScheme(
        string Primary,   // hex
        string Secondary,
        string Accent,
        string Light
    );

    private static ColorScheme GetScheme(int gradeLevel) => gradeLevel switch
    {
        <= 3 => new("#7C3AED", "#F59E0B", "#10B981", "#FFF7ED"),  // Grade 1-3: Violet + Amber + Emerald
        <= 6 => new("#1D4ED8", "#0891B2", "#D97706", "#EFF6FF"),  // Grade 4-6: Blue + Cyan + Amber
        <= 8 => new("#1E3A8A", "#64748B", "#C0C0C0", "#F1F5F9"),  // Grade 7-8: Deep Blue + Slate + Silver
        _    => new("#1E3A8A", "#6D28D9", "#D4AF37", "#F8FAFC"),  // Grade 9-10: Deep Blue + Purple + Gold
    };

    private static string GetCertTitle(int gradeLevel, string certTitle) =>
        string.IsNullOrEmpty(certTitle) ? gradeLevel switch
        {
            <= 3 => "CERTIFICATE OF ACHIEVEMENT",
            <= 6 => "CERTIFICATE OF ACHIEVEMENT",
            <= 8 => "CERTIFICATE OF COMPLETION",
            _    => "CERTIFICATE OF ACHIEVEMENT",
        } : certTitle.ToUpper();

    // ── PDF Generation ───────────────────────────────────────────────────────

    public async Task<byte[]> GeneratePdfAsync(CertificateDto cert, string logoPath)
    {
        var scheme = GetScheme(cert.GradeLevel);
        byte[]? logoBytes = File.Exists(logoPath) ? await File.ReadAllBytesAsync(logoPath) : null;
        byte[] qrBytes = GenerateQrCodeBytes(cert.QrCodeData ?? $"https://nubeera.tech/verify/{cert.CertificateNumber}");

        var primaryColor = Color.FromHex(scheme.Primary);
        var accentColor  = Color.FromHex(scheme.Accent);
        var lightColor   = Color.FromHex(scheme.Light);

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontColor(Colors.Grey.Darken4));

                page.Content().Column(col =>
                {
                    // ── OUTER BORDER FRAME ─────────────────────────────────
                    col.Item().Padding(12).Border(3).BorderColor(accentColor).Column(inner =>
                    {
                        inner.Item().Padding(8).Border(1).BorderColor(primaryColor).Column(body =>
                        {
                            // ── HEADER ────────────────────────────────────
                            body.Item()
                                .Background(primaryColor)
                                .Padding(20)
                                .Row(row =>
                                {
                                    // Logo
                                    row.ConstantItem(80).AlignMiddle().Column(c =>
                                    {
                                        if (logoBytes != null)
                                            c.Item().Width(70).Height(70).Image(logoBytes, ImageScaling.FitArea);
                                        else
                                            c.Item().Width(70).Height(70)
                                                .Background(Colors.White)
                                                .AlignCenter().AlignMiddle()
                                                .Text("V").FontSize(36).Bold().FontColor(primaryColor);
                                    });

                                    // Company name + tagline
                                    row.RelativeItem().AlignMiddle().Padding(10).Column(c =>
                                    {
                                        c.Item().Text("NubeEra Tech STEM Marketplace")
                                            .FontSize(22).Bold().FontColor(Colors.White);
                                        c.Item().Text("Empowering Young Innovators — STEM · Robotics · AI · Coding")
                                            .FontSize(10).FontColor(Colors.White).Italic();
                                    });

                                    // Certificate label
                                    row.ConstantItem(160).AlignMiddle().AlignRight().Column(c =>
                                    {
                                        c.Item().Background(accentColor).Padding(10).AlignCenter().Column(inner2 =>
                                        {
                                            inner2.Item().Text("NUBEERA").FontSize(9).Bold()
                                                .FontColor(Colors.White).LetterSpacing(3);
                                            inner2.Item().Text("CERTIFIED").FontSize(9).Bold()
                                                .FontColor(Colors.White).LetterSpacing(2);
                                        });
                                    });
                                });

                            // ── DECORATIVE GOLD BAR ────────────────────────
                            body.Item().Height(6).Background(accentColor);

                            // ── MAIN BODY ──────────────────────────────────
                            body.Item()
                                .Background(lightColor)
                                .Padding(30)
                                .Column(main =>
                                {
                                    // Certificate type title
                                    main.Item().AlignCenter()
                                        .Text(GetCertTitle(cert.GradeLevel, cert.CertificateTitle ?? ""))
                                        .FontSize(32).Bold().FontColor(primaryColor)
                                        .LetterSpacing(4);

                                    if (!string.IsNullOrEmpty(cert.Tagline))
                                    {
                                        main.Item().Height(4);
                                        main.Item().AlignCenter()
                                            .Text(cert.Tagline)
                                            .FontSize(11).Italic().FontColor(Colors.Grey.Darken1);
                                    }

                                    main.Item().Height(16);

                                    // Presented-to text
                                    main.Item().AlignCenter()
                                        .Text("This certificate is proudly awarded to")
                                        .FontSize(14).Italic().FontColor(Colors.Grey.Darken2);

                                    main.Item().Height(12);

                                    // Student Name — large gold-accented
                                    main.Item().AlignCenter()
                                        .BorderBottom(2).BorderColor(accentColor)
                                        .Padding(8)
                                        .Text(cert.StudentName.ToUpper())
                                        .FontSize(40).Bold().FontColor(primaryColor);

                                    main.Item().Height(16);

                                    // Body text
                                    main.Item().AlignCenter()
                                        .Text($"for successfully completing")
                                        .FontSize(13).Italic().FontColor(Colors.Grey.Darken2);

                                    main.Item().Height(6);

                                    main.Item().AlignCenter()
                                        .Text(cert.CourseName)
                                        .FontSize(22).Bold().FontColor(accentColor);

                                    main.Item().Height(8);

                                    main.Item().AlignCenter()
                                        .Text($"during the academic year  {cert.AcademicYear}")
                                        .FontSize(13).FontColor(Colors.Grey.Darken2);

                                    main.Item().Height(20);

                                    // ── Details Row ──────────────────────
                                    main.Item().Row(details =>
                                    {
                                        void Detail(RowDescriptor r, string label, string value) =>
                                            r.RelativeItem().AlignCenter().Column(c =>
                                            {
                                                c.Item().Text(label).FontSize(9).FontColor(Colors.Grey.Medium).LetterSpacing(1);
                                                c.Item().Text(value).FontSize(12).Bold().FontColor(primaryColor);
                                            });

                                        Detail(details, "GRADE / CLASS", cert.GradeName);
                                        Detail(details, "PROGRAM", cert.ProgramType);
                                        Detail(details, "COMPLETION DATE", cert.CompletionDate.ToString("dd MMM yyyy"));
                                        if (cert.Percentage.HasValue)
                                            Detail(details, "SCORE", $"{cert.Percentage:F1}%");
                                        if (!string.IsNullOrEmpty(cert.PerformanceLevel))
                                            Detail(details, "GRADE AWARDED", cert.PerformanceLevel);
                                        Detail(details, "SCHOOL", cert.SchoolName.Length > 22
                                            ? cert.SchoolName[..22] + "…" : cert.SchoolName);
                                    });

                                    main.Item().Height(24);

                                    // ── Signature Row + QR ────────────────
                                    main.Item().Row(sigRow =>
                                    {
                                        void Sig(RowDescriptor r, string? name, string? designation) =>
                                            r.RelativeItem().AlignCenter().Column(c =>
                                            {
                                                c.Item().Height(40).BorderBottom(1).BorderColor(primaryColor);
                                                c.Item().PaddingTop(4).Text(name ?? "_______________").FontSize(11).Bold().FontColor(primaryColor);
                                                c.Item().Text(designation ?? "").FontSize(9).FontColor(Colors.Grey.Darken2).Italic();
                                            });

                                        if (!string.IsNullOrEmpty(cert.PrincipalName))
                                            Sig(sigRow, cert.PrincipalName, cert.PrincipalDesignation ?? "Principal");
                                        else
                                            Sig(sigRow, "________________", "Principal");

                                        if (!string.IsNullOrEmpty(cert.StaffName))
                                            Sig(sigRow, cert.StaffName, cert.StaffDesignation ?? "Staff Coordinator");
                                        else
                                            Sig(sigRow, "________________", "Staff Coordinator");

                                        if (!string.IsNullOrEmpty(cert.DirectorName))
                                            Sig(sigRow, cert.DirectorName, cert.DirectorDesignation ?? "Director");
                                        else
                                            Sig(sigRow, "________________", "Director");

                                        // QR Code
                                        sigRow.ConstantItem(100).AlignCenter().Column(c =>
                                        {
                                            c.Item().Width(80).Height(80).Image(qrBytes, ImageScaling.FitArea);
                                            c.Item().AlignCenter().Text("Scan to verify").FontSize(8).FontColor(Colors.Grey.Darken2);
                                        });
                                    });
                                });

                            // ── FOOTER ────────────────────────────────────
                            body.Item()
                                .Background(primaryColor)
                                .Padding(10)
                                .Row(footer =>
                                {
                                    footer.RelativeItem().AlignMiddle()
                                        .Text($"Certificate No: {cert.CertificateNumber}  |  Issued: {(cert.IssuedAt ?? cert.CreatedAt).ToString("dd MMM yyyy")}  |  Student ID: {cert.StudentIdNumber}")
                                        .FontSize(9).FontColor(Colors.White);

                                    footer.ConstantItem(200).AlignMiddle().AlignRight()
                                        .Text($"Verify at: nubeera.tech/verify/{cert.CertificateNumber}")
                                        .FontSize(9).FontColor(Colors.White).Italic();
                                });
                        });
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }
}
