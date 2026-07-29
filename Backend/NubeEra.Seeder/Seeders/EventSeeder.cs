using NubeEra.Seeder.Core;
using static NubeEra.Seeder.Core.BulkHelper;

namespace NubeEra.Seeder.Seeders;

/// <summary>
/// Seeds: 10 Events distributed across schools
/// </summary>
public static class EventSeeder
{
    private static readonly (string Title, string Category, string Desc)[] EventTemplates =
    [
        ("National Robotics Championship", "Robotics Competition",
            "Annual robotics competition where students build and program robots to complete real-world challenges."),
        ("Python Coding Hackathon", "Coding Challenge",
            "24-hour hackathon where students develop Python applications to solve community problems."),
        ("AI Innovation Summit", "AI Workshop",
            "Day-long workshop on the latest advancements in artificial intelligence and machine learning."),
        ("STEM Science Fair", "STEM Exhibition",
            "Students present science, technology, engineering, and mathematics projects to a panel of judges."),
        ("Inter-School Science Competition", "Science Fair",
            "Competition showcasing scientific experiments and innovations by students across participating schools."),
        ("IoT & Smart Systems Workshop", "AI Workshop",
            "Hands-on workshop on Internet of Things, sensors, and smart home/city systems."),
        ("Arduino & Electronics Bootcamp", "Coding Challenge",
            "Intensive 3-day bootcamp covering electronics fundamentals and Arduino programming."),
        ("Drone Racing Tournament", "Robotics Competition",
            "FPV drone racing event where student-built drones compete on an obstacle course."),
        ("Machine Learning for Students", "AI Workshop",
            "Introductory ML workshop covering data science, neural networks, and model training."),
        ("STEM Career Expo", "STEM Exhibition",
            "Career exploration event connecting students with STEM professionals and university representatives."),
    ];

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        var now  = DateTime.UtcNow;
        var rows = new List<string>(10);

        for (int n = 1; n <= 10; n++)
        {
            var id         = NewGuid();
            var schoolNum  = ((n - 1) % 10) + 1;
            var schoolId   = ctx.SchoolId(schoolNum);
            var tmpl       = EventTemplates[(n - 1) % EventTemplates.Length];
            var eventDate  = now.AddDays(30 + n * 3);
            var deadline   = eventDate.AddDays(-7);
            var status     = n <= 30 ? "Completed" : n <= 60 ? "Ongoing" : "Upcoming";
            var venue      = $"Main Auditorium, SCH{schoolNum:D3} Campus";

            rows.Add(
                $"({G(id)},{G(schoolId)}," +
                $"{Q($"{tmpl.Title} - SCH{schoolNum:D3} {n:D3}")}," +
                $"{Q(tmpl.Desc)}," +
                $"{Q(tmpl.Category)}," +
                $"'{eventDate:yyyy-MM-dd HH:mm:ss}'," +
                $"'{deadline:yyyy-MM-dd HH:mm:ss}'," +
                $"{Q(venue)}," +
                $"{200 + (n % 300)}," +
                $"{20 + (n % 30)}," +
                $"{10 + (n % 20)},0," +
                $"{Q(status)}," +
                $"'[]',{D(now)})");
        }

        await using var bulk = new BulkHelper(connStr, 200);
        await bulk.OpenAsync();
        await bulk.BulkInsertAsync("Events",
            "Id,SchoolId,Title,Description,Category,Date,Deadline,Venue,MaxParticipants,MaxTeams,WaitlistLimit,AutoApproval,Status,CustomFieldsJson,CreatedAt",
            rows, label: "Events (10)");
    }
}
