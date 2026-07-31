using Veriton.Seeder.Core;
using static Veriton.Seeder.Core.BulkHelper;

namespace Veriton.Seeder.Seeders;

/// <summary>
/// Seeds: 5 ProductCategories + 10 Products (STEM/Robotics equipment — 2 per category)
/// </summary>
public static class CommerceSeeder
{
    private static readonly (string Cat, (string Name, string Sku, decimal Price, int Stock)[] Products)[] Catalogue =
    [
        ("Robotics Kits", new[]
        {
            ("Lego Mindstorms EV3 Core Set",          "SKU-ROB-001", 349.99m, 50),
            ("VEX IQ Super Kit Gen 2",                "SKU-ROB-002", 249.99m, 40),
            ("mBot2 Smart Robot Kit",                 "SKU-ROB-003", 189.99m, 60),
            ("Spike Prime LEGO Education Set",        "SKU-ROB-004", 329.99m, 35),
            ("Ozobot Evo Classroom Pack (12)",        "SKU-ROB-005", 599.99m, 20),
            ("Makeblock Ranger Robot Kit",            "SKU-ROB-006", 149.99m, 75),
            ("Sphero BOLT Power Pack (15)",           "SKU-ROB-007", 799.99m, 15),
            ("Edison V3 Robot (Twin Pack)",           "SKU-ROB-008",  69.99m, 100),
            ("micro:bit Go Bundle v2",                "SKU-ROB-009",  29.99m, 200),
            ("Raspberry Pi 4 Starter Kit (4GB)",     "SKU-ROB-010",  79.99m, 80),
        }),
        ("Arduino & Microcontrollers", new[]
        {
            ("Arduino UNO R4 WiFi",                  "SKU-ARD-001",  27.99m, 150),
            ("Arduino Mega 2560 Rev3",               "SKU-ARD-002",  38.50m, 120),
            ("Arduino Nano 33 IoT",                  "SKU-ARD-003",  19.99m, 200),
            ("ESP32 DevKit V1 (WROOM-32)",           "SKU-ARD-004",   8.99m, 300),
            ("ESP8266 NodeMCU V3",                   "SKU-ARD-005",   5.99m, 400),
            ("Seeed Studio XIAO ESP32C3",            "SKU-ARD-006",   6.99m, 250),
            ("Adafruit Circuit Playground Express",  "SKU-ARD-007",  24.95m, 100),
            ("STM32 Blue Pill Dev Board",            "SKU-ARD-008",   4.99m, 500),
            ("Arduino Starter Kit Official",         "SKU-ARD-009",  99.00m, 60),
            ("Elegoo Mega 2560 R3 Super Starter Kit","SKU-ARD-010",  38.99m, 80),
        }),
        ("Sensors & Modules", new[]
        {
            ("HC-SR04 Ultrasonic Distance Sensor",   "SKU-SEN-001",   2.99m, 500),
            ("DHT22 Temp & Humidity Sensor",         "SKU-SEN-002",   3.99m, 400),
            ("MPU-6050 Gyro + Accelerometer Module", "SKU-SEN-003",   4.49m, 300),
            ("PIR Motion Sensor Module",             "SKU-SEN-004",   2.49m, 600),
            ("MQ-2 Gas Sensor Module",               "SKU-SEN-005",   3.49m, 350),
            ("Soil Moisture Sensor Module",          "SKU-SEN-006",   1.99m, 700),
            ("Rain Drop Detection Sensor",           "SKU-SEN-007",   1.99m, 600),
            ("BMP280 Barometric Pressure Sensor",    "SKU-SEN-008",   3.49m, 400),
            ("Colour TCS3200 Sensor Module",         "SKU-SEN-009",   4.99m, 250),
            ("RFID RC522 Module + Card + Key Fob",  "SKU-SEN-010",   3.99m, 450),
        }),
        ("AI & Machine Learning Devices", new[]
        {
            ("NVIDIA Jetson Nano 4GB Developer Kit", "SKU-AI-001",  149.00m, 25),
            ("Coral USB Accelerator (Edge TPU)",     "SKU-AI-002",   59.99m, 40),
            ("OpenMV Cam H7 Plus",                  "SKU-AI-003",   84.99m, 30),
            ("Pixy2 Smart Vision Sensor",            "SKU-AI-004",   59.99m, 35),
            ("Google AIY Vision Kit",               "SKU-AI-005",   24.99m, 50),
            ("Luxonis OAK-D-Lite Depth AI Camera",  "SKU-AI-006",  149.00m, 20),
            ("ROCK 3A Single Board Computer (2GB)", "SKU-AI-007",   39.99m, 45),
            ("Seeed reTerminal with CM4 (4GB)",     "SKU-AI-008",   195.00m, 15),
            ("Intel Neural Compute Stick 2",        "SKU-AI-009",   79.99m, 30),
            ("Maix Bit RISC-V AI + IoT Board",      "SKU-AI-010",   14.99m, 100),
        }),
        ("STEM Kits & Education Sets", new[]
        {
            ("Thames & Kosmos CHEM C500 Kit",        "SKU-STEM-001",  34.99m, 60),
            ("4M Solar Rover Science Kit",           "SKU-STEM-002",  17.99m, 80),
            ("K'NEX Education STEM Explorations Set","SKU-STEM-003",  44.99m, 50),
            ("LittleBits Electronics Starter Kit",   "SKU-STEM-004",  99.99m, 40),
            ("Snap Circuits Pro SC-500 Kit",         "SKU-STEM-005",  79.99m, 55),
            ("Elenco Electronic Playground 500-in-1","SKU-STEM-006",  24.99m, 70),
            ("Engino STEM Mechanical Science Set",   "SKU-STEM-007",  39.99m, 65),
            ("Kiwico Tinker Crate Monthly Box",      "SKU-STEM-008",  19.99m, 200),
            ("National Geographic Mega Science Lab", "SKU-STEM-009",  29.99m, 90),
            ("Thames & Kosmos Wind Power 2.0 Kit",   "SKU-STEM-010",  34.99m, 75),
        }),
    ];

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        var now = DateTime.UtcNow;
        await using var bulk = new BulkHelper(connStr, 200);
        await bulk.OpenAsync();

        var catRows  = new List<string>();
        var prodRows = new List<string>();
        int prodNum  = 0;

        foreach (var (catName, products) in Catalogue)
        {
            var catId = NewGuid();
            catRows.Add($"({G(catId)},{Q(catName)},{Q($"High-quality {catName} for STEM education")},1,NULL,{D(now)})");

            foreach (var (title, sku, price, stock) in products.Take(2))  // 2 per category = 10 total
            {
                prodNum++;
                var pid = NewGuid();
                var features  = $"[\"Educational\",\"STEM\",\"Hands-on learning\",\"Safety certified\"]";
                var specs     = $"{{\"Weight\":\"varies\",\"AgeGroup\":\"8+\",\"InBox\":\"Full kit\"}}";

                prodRows.Add(
                    $"({G(pid)},{Q(title)},{Q($"Professional {catName} — {title}")},{Q($"Complete {title} kit for classroom use. Ideal for Grades 3-12 STEM and robotics education. Includes all required components and a comprehensive teacher guide.")}," +
                    $"{G(catId)},NULL,{Q(sku)},NULL," +
                    $"{price:F2},NULL,{Q("[]")},NULL,{stock},1,{Q("Veriton EDU")}," +
                    $"NULL,NULL,NULL,NULL,{Q(features)},{Q(specs)},{Q("Grade 3-12")},{Q("Grade 3-12")}," +
                    $"{Q("[\"robotics\",\"stem\",\"education\",\"coding\"]")},0,0,1,1,99,NULL,NULL,NULL,1,NULL,{D(now)})");
            }
        }

        await bulk.BulkInsertAsync("ProductCategories",
            "Id,Name,Description,IsActive,UpdatedAt,CreatedAt", catRows, label: "ProductCategories");

        await bulk.BulkInsertAsync("Products",
            "Id,Title,ShortDescription,FullDescription,CategoryId,Subcategory,SkuCode,Barcode," +
            "Price,DiscountPrice,ImagesJson,ThumbnailUrl,StockQuantity,IsAvailable,BrandName," +
            "Weight,Dimensions,WarrantyDetails,SafetyInstructions,FeaturesJson,SpecificationsJson," +
            "RecommendedAgeGroup,SchoolGradeCompatibility,TagsJson,IsFeatured,IsTrending,IsNewArrival," +
            "MinOrderQuantity,MaxOrderQuantity,ShippingType,DeliveryEstimate,ReturnPolicy,IsVisible," +
            "UpdatedAt,CreatedAt",
            prodRows, label: "Products (10)");
    }
}
