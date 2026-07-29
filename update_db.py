import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="root123",
        database="nubeera_db"
    )
    cursor = conn.cursor()
    
    # Update users' SchoolId to match their students profile SchoolId if they differ
    cursor.execute("""
        UPDATE users u
        INNER JOIN students s ON s.UserId = u.Id
        SET u.SchoolId = s.SchoolId
        WHERE u.SchoolId != s.SchoolId
    """)
    conn.commit()
    print(f"Synchronized SchoolId for {cursor.rowcount} mismatched user rows.")
    
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
