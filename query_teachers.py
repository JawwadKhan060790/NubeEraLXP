import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="root123",
        database="nubeera_db"
    )
    cursor = conn.cursor(dictionary=True)
    
    print("--- User s2 ---")
    cursor.execute("SELECT Id, Email FROM users WHERE Email = 's2@gmail.com'")
    user = cursor.fetchone()
    print(user)

    print("\n--- Student s2 ---")
    cursor.execute("SELECT * FROM students WHERE UserId = %s", (user['Id'],))
    student = cursor.fetchone()
    for k, v in student.items():
        print(f"{k}: {v}")

    print("\n--- Updating Event Registration StudentId ---")
    cursor.execute("""
        UPDATE eventregistrations 
        SET StudentId = 'dc744683-d12e-48e8-b9b9-a6ee923a123c' 
        WHERE StudentId = '00000000-0000-0000-0000-000000000002'
    """)
    conn.commit()
    print("Updated rows:", cursor.rowcount)

    print("\n--- Event Registrations ---")
    cursor.execute("SELECT Id, EventId, StudentId, Status FROM eventregistrations")
    regs = cursor.fetchall()
    for r in regs:
        print(r)

    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)

