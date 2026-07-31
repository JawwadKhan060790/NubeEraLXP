using Veriton.Seeder.Core;
using static Veriton.Seeder.Core.BulkHelper;

namespace Veriton.Seeder.Seeders;

/// <summary>
/// Seeds:
///   TicketCategories (1 per school = 10 total categories)
///   10 Tickets with mixed statuses
///   Ticket Comments (1 per ticket = 10)
///   Ticket History entries (10)
/// </summary>
public static class SupportSeeder
{
    private const int TICKET_COUNT = 10;

    private static readonly string[] CatNames =
        ["Technical Support", "Academic Issues", "Account Access", "Equipment Request", "General Inquiry"];

    private static readonly string[] Subjects =
    [
        "Unable to login to student portal",
        "Robotics kit component missing",
        "Video lesson not loading",
        "Arduino IDE installation error",
        "MCQ exam not submitting results",
        "Report card not visible in student dashboard",
        "Python activity crashing on submit",
        "Attendance marked incorrectly",
        "Request for additional STEM materials",
        "AI workshop registration issue",
        "Grade not updated after exam",
        "Network connectivity problem in lab",
        "Parent portal access denied",
        "Lesson PDF download broken",
        "Certificate not generated after completion",
    ];

    private static readonly string[] Descriptions =
    [
        "I am experiencing an issue with logging into my account. Error code 401 appears.",
        "The assigned robotics kit is missing the ultrasonic sensor component needed for today's activity.",
        "The topic video for Unit 3 Topic 2 is not loading. It shows a spinner indefinitely.",
        "When attempting to install Arduino IDE 2.3, the installer throws a missing .NET runtime error.",
        "After completing the MCQ exam, the results page shows 0/10 despite answering all questions.",
        "My report card for the mid-term exam is not appearing in my dashboard.",
        "The Python coding activity in Unit 2 crashes when I submit code with a syntax error.",
        "My attendance for last Monday shows Absent but I was present and the teacher confirmed.",
        "Our school needs additional Raspberry Pi kits for the upcoming IoT workshop.",
        "I registered for the AI workshop but I don't see it in my event registrations.",
    ];

    // TicketStatus enum: Open=0, InProgress=1, Pending=2, Resolved=3, Closed=4, Reopened=5
    // TicketPriority enum: Low=0, Medium=1, High=2
    // "Rejected" is not in TicketStatus → map to Closed=4
    private static readonly (int Status, int Weight)[] Statuses =
        [(0, 20), (1, 25), (2, 15), (3, 30), (4, 8), (4, 2)];

    private static readonly string[] StatusNames =
        ["Open", "InProgress", "Pending", "Resolved", "Closed", "Reopened"];

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        var now = DateTime.UtcNow;
        await using var bulk = new BulkHelper(connStr, 1_000);
        await bulk.OpenAsync();

        // ── Ticket Categories (1 per school = 10 cats) ───────────────────
        var catRows = new List<string>(10);
        var catIds  = new Dictionary<int, List<string>>(); // schoolNum → list of catIds

        for (int s = 1; s <= 10; s++)
        {
            var schoolId = ctx.SchoolId(s);
            catIds[s] = new List<string>(1);
            foreach (var cn in CatNames.Take(1))  // 1 category per school
            {
                var catId = NewGuid();
                catIds[s].Add(catId);
                catRows.Add(
                    $"({G(catId)},{G(schoolId)},{Q(cn)}," +
                    $"{Q($"{cn} – submit all {cn.ToLower()} related issues here.")},1,{D(now)})");
            }
        }
        await bulk.BulkInsertAsync("TicketCategories",
            "Id,SchoolId,Name,Description,IsActive,CreatedAt",
            catRows, label: "TicketCategories (10)");

        // ── Tickets (3,000) ───────────────────────────────────────────────
        var ticketRows  = new List<string>(TICKET_COUNT);
        var commentRows = new List<string>(TICKET_COUNT * 2);
        var historyRows = new List<string>(TICKET_COUNT);
        var ticketIds   = new List<string>(TICKET_COUNT);

        // Build weighted status pool (int enum values)
        var statusPool = new List<int>(100);
        foreach (var (st, w) in Statuses)
            for (int i = 0; i < w; i++) statusPool.Add(st);

        var rand = new Random(42);

        for (int n = 1; n <= TICKET_COUNT; n++)
        {
            var ticketId  = NewGuid();
            ticketIds.Add(ticketId);
            var schoolNum = ((n - 1) % 10) + 1;
            var schoolId  = ctx.SchoolId(schoolNum);
            var catList   = catIds[schoolNum];
            var catId     = catList[(n - 1) % catList.Count];

            // Requester = student user for this school
            var studentNum = ((n - 1) % 10) + 1;
            studentNum = Math.Min(studentNum, 10);
            var requesterUserId = ctx.StudentIds.TryGetValue(studentNum, out var st2) ? st2.UserId
                                : ctx.PrincipalUserIds.GetValueOrDefault(schoolNum, NewGuid());

            var subj    = Subjects[(n - 1) % Subjects.Length];
            var desc    = Descriptions[(n - 1) % Descriptions.Length];
            var status  = statusPool[rand.Next(statusPool.Count)]; // int: 0=Open,1=InProgress,2=Pending,3=Resolved,4=Closed
            var prio    = new[] { 0, 1, 2, 2 }[(n - 1) % 4];     // int: 0=Low,1=Medium,2=High ("Critical"→High=2)
            var created = now.AddDays(-(rand.Next(90)));
            var resolved = (status == 3 || status == 4) ? created.AddDays(rand.Next(1, 14)) : (DateTime?)null;
            var tickNum  = $"TKT-{n:D6}";

            ticketRows.Add(
                $"({G(ticketId)},{G(schoolId)},{Q(tickNum)}," +
                $"{G(requesterUserId)},NULL," +
                $"{Q(subj)},{Q(desc)}," +
                $"{prio},{status}," +
                $"{G(catId)}," +
                $"{(resolved.HasValue ? $"'{resolved:yyyy-MM-dd HH:mm:ss}'" : "NULL")}," +
                $"'{created:yyyy-MM-dd HH:mm:ss}')");

            // 1 comment per ticket
            var commentCount = 1;
            for (int c = 1; c <= commentCount; c++)
            {
                var cid    = NewGuid();
                var userId = c == 1 ? requesterUserId : ctx.PrincipalUserIds.GetValueOrDefault(schoolNum, requesterUserId);
                var msgs   = c == 1
                    ? new[] { "Please help resolve this as soon as possible.", "I have attached the screenshots.", "This is urgent – class starts in 30 minutes." }
                    : new[] { "We are looking into this issue.", "Our team has been notified.", "Issue is being investigated.", "Please try again and let us know." };
                commentRows.Add(
                    $"({G(cid)},{G(ticketId)},{G(userId)}," +
                    $"{Q(msgs[rand.Next(msgs.Length)])},0,'{created.AddMinutes(c * 30):yyyy-MM-dd HH:mm:ss}')");
            }

            // History entry  (Action, OldValue, NewValue — varchar columns, store display names)
            var hid        = NewGuid();
            var statusName = StatusNames[Math.Min(status, StatusNames.Length - 1)];
            historyRows.Add(
                $"({G(hid)},{G(ticketId)},{G(requesterUserId)}," +
                $"{Q("StatusChanged")},{Q("Open")},{Q(statusName)}," +
                $"'{created.AddMinutes(5):yyyy-MM-dd HH:mm:ss}')");
        }

        await bulk.BulkInsertAsync("Tickets",
            "Id,SchoolId,TicketNumber,RequesterUserId,AssignedToUserId,Subject,Description,Priority,Status,CategoryId,ResolvedAt,CreatedAt",
            ticketRows, label: "Tickets (10)");

        await bulk.BulkInsertAsync("TicketComments",
            "Id,TicketId,UserId,Content,IsInternal,CreatedAt",
            commentRows, label: "TicketComments");

        await bulk.BulkInsertAsync("TicketHistories",
            "Id,TicketId,UserId,Action,OldValue,NewValue,CreatedAt",
            historyRows, label: "TicketHistories");
    }
}
