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
    
    print("--- Users Table Structure ---")
    cursor.execute("DESCRIBE users")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- Some Users in Table ---")
    cursor.execute("SELECT Email, LENGTH(PasswordHash), PasswordHash FROM users LIMIT 10")
    for row in cursor.fetchall():
        print(row)
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
