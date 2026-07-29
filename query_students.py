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
    
    print("--- Roles ---")
    cursor.execute("SELECT * FROM roles")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- Student Users joined with Student Profiles ---")
    cursor.execute("""
        SELECT u.Id as UserId, u.Email as UserEmail, s.Id as StudentId, s.FirstName, s.LastName, s.GradeId, s.SchoolId
        FROM users u
        INNER JOIN students s ON u.Id = s.UserId
        LIMIT 10
    """)
    for row in cursor.fetchall():
        print(row)

    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
