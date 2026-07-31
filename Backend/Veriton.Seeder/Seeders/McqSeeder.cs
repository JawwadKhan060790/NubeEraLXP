using Veriton.Seeder.Core;
using static Veriton.Seeder.Core.BulkHelper;

namespace Veriton.Seeder.Seeders;

/// <summary>
/// Seeds:
///   10 Exams (one per module)
///   10 MCQ Questions (1 per exam)
/// </summary>
public static class McqSeeder
{
    private const int EXAM_COUNT     = 10;
    private const int QUESTIONS_PER  = 1;

    private static readonly (string Topic, string Q, string A, string B, string C, string D, string Ans)[] QBank =
    [
        ("Robotics", "What does GPIO stand for?",
            "General Purpose Input/Output","Graphics Processing Interface Output",
            "General Programmed Input Operation","Global Power Interface Option","A"),
        ("Robotics", "Which programming language is natively used with Arduino?",
            "Python","Java","C/C++","Rust","C"),
        ("Python", "Which keyword is used to define a function in Python?",
            "func","define","def","function","C"),
        ("Python", "What data type is the result of 3 / 2 in Python 3?",
            "int","float","double","str","B"),
        ("Python", "Which built-in function returns the length of a list?",
            "size()","count()","len()","length()","C"),
        ("AI", "Which algorithm is used for image classification in deep learning?",
            "Decision Tree","Linear Regression","Convolutional Neural Network","K-Means Clustering","C"),
        ("AI", "What does 'overfitting' mean in machine learning?",
            "Model performs well on training data but poorly on new data",
            "Model has too few parameters","Model is trained on too little data","Model is too simple","A"),
        ("AI", "Which Python library is commonly used for machine learning?",
            "NumPy","Django","scikit-learn","Flask","C"),
        ("STEM", "What is Ohm's Law?",
            "V = I × R","P = F / A","F = m × a","E = mc²","A"),
        ("STEM", "What does STEM stand for?",
            "Science, Technology, Engineering, Mathematics",
            "Software, Tools, Electronics, Mechanics",
            "Systems, Testing, Engineering, Modules",
            "Science, Training, Education, Math","A"),
        ("Coding", "What is the output of print(2 ** 8) in Python?",
            "16","64","128","256","D"),
        ("Coding", "In Python, what does the 'range(5)' function return?",
            "0, 1, 2, 3, 4, 5","1, 2, 3, 4, 5","0, 1, 2, 3, 4","0, 1, 2, 3, 4, 5, 6","C"),
        ("Electronics", "What component stores electrical charge?",
            "Resistor","Transistor","Capacitor","Diode","C"),
        ("Electronics", "What is the unit of electrical resistance?",
            "Ampere","Volt","Watt","Ohm","D"),
        ("Electronics", "A breadboard is used to:",
            "Solder components permanently","Prototype circuits without soldering",
            "Measure voltage","Generate power","B"),
        ("IoT", "What protocol is most commonly used in IoT for messaging?",
            "HTTP","FTP","MQTT","SMTP","C"),
        ("IoT", "ESP32 supports which wireless connectivity? (Select best answer)",
            "Wi-Fi only","Bluetooth only","Wi-Fi and Bluetooth","Zigbee only","C"),
        ("Math", "What is the time complexity of binary search?",
            "O(n)","O(log n)","O(n²)","O(1)","B"),
        ("Math", "How many bits are in one byte?",
            "4","8","16","32","B"),
        ("Science", "What is the chemical symbol for gold?",
            "Go","Gd","Au","Ag","C"),
    ];

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        var now      = DateTime.UtcNow;
        var rand     = new Random(42);
        var examRows = new List<string>(EXAM_COUNT);
        var qRows    = new List<string>(EXAM_COUNT * QUESTIONS_PER);

        int modSeq = 1;
        foreach (var (schoolNum, schoolId) in ctx.Schools.Take(EXAM_COUNT))
        {
            // Units are now school-agnostic (keyed by grade level); resolve the
            // school's own grade level to find the matching Unit and Grade row.
            var level = ((schoolNum - 1) % 10) + 1;
            if (!ctx.ModuleIds.TryGetValue(level, out var mod)) continue;
            var modId   = mod.ModuleId;
            var gradeId = ctx.GradeId(schoolNum, level);

            var examId    = NewGuid();
            var examDate  = now.AddDays(-rand.Next(1, 90));
            var tchNum    = ((modSeq - 1) % 10) + 1;
            var tId       = ctx.TeacherIds.TryGetValue(tchNum, out var t) ? t.TeacherId : (string?)null;

            ctx.ExamIds.Add((examId, schoolId, gradeId, modId));

            examRows.Add(
                $"({G(examId)},{G(schoolId)},{G(gradeId)},{G(modId)},NULL," +
                $"'{examDate:yyyy-MM-dd HH:mm:ss}'," +
                $"{(tId != null ? G(tId) : "NULL")}," +
                $"{Q($"Unit {modSeq} MCQ Assessment")}," +
                $"40,16,45,1,'{now:yyyy-MM-dd HH:mm:ss}')");

            for (int q = 1; q <= QUESTIONS_PER; q++)
            {
                var qi   = QBank[(rand.Next(QBank.Length))];
                var qid  = NewGuid();
                qRows.Add(
                    $"({G(qid)},{G(schoolId)},{G(examId)},{G(modId)},NULL," +
                    $"{Q($"{qi.Q} [Unit {modSeq} Q{q}]")}," +
                    $"{Q(qi.A)},{Q(qi.B)},{Q(qi.C)},{Q(qi.D)}," +
                    $"{Q(qi.Ans)},1,'{now:yyyy-MM-dd HH:mm:ss}')");
            }
            modSeq++;
        }

        await using var bulk = new BulkHelper(connStr, 1_000);
        await bulk.OpenAsync();

        await bulk.BulkInsertAsync("exams",
            "Id,SchoolId,GradeId,ModuleId,LessonId,Date,CreatedByTeacherId,Title,TotalMarks,PassingMarks,DurationMinutes,IsActive,CreatedAt",
            examRows, label: "Exams (10)");

        await bulk.BulkInsertAsync("questions",
            "Id,SchoolId,ExamId,ModuleId,LessonId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,IsActive,CreatedAt",
            qRows, label: "Questions (10 MCQ)");
    }
}
