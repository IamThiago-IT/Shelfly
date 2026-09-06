use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub file_path: String,
    pub total_pages: i64,
    pub current_page: i64,
    pub progress: f64,
    pub last_read: Option<String>,
    pub added_at: String,
    pub cover_thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bookmark {
    pub id: String,
    pub book_id: String,
    pub page: i64,
    pub title: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingSession {
    pub book_id: String,
    pub current_page: i64,
    pub scroll_position: f64,
    pub scale: f64,
    pub rotation: i64,
    pub last_read: String,
}

pub fn get_db_path(app_data_dir: &PathBuf) -> PathBuf {
    let books_dir = app_data_dir.join("books");
    std::fs::create_dir_all(&books_dir).ok();
    app_data_dir.join("shelfly.db")
}

pub fn init_db(db_path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'Unknown',
            file_path TEXT NOT NULL,
            total_pages INTEGER NOT NULL DEFAULT 0,
            current_page INTEGER NOT NULL DEFAULT 0,
            progress REAL NOT NULL DEFAULT 0.0,
            last_read TEXT,
            added_at TEXT NOT NULL,
            cover_thumbnail TEXT
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            page INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reading_sessions (
            book_id TEXT PRIMARY KEY,
            current_page INTEGER NOT NULL DEFAULT 1,
            scroll_position REAL NOT NULL DEFAULT 0.0,
            scale REAL NOT NULL DEFAULT 1.0,
            rotation INTEGER NOT NULL DEFAULT 0,
            last_read TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
        "
    )?;

    Ok(conn)
}

pub fn import_book(conn: &Connection, book: &Book) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO books (id, title, author, file_path, total_pages, current_page, progress, last_read, added_at, cover_thumbnail)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            book.id,
            book.title,
            book.author,
            book.file_path,
            book.total_pages,
            book.current_page,
            book.progress,
            book.last_read,
            book.added_at,
            book.cover_thumbnail,
        ],
    )?;
    Ok(())
}

pub fn get_all_books(conn: &Connection) -> Result<Vec<Book>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, author, file_path, total_pages, current_page, progress, last_read, added_at, cover_thumbnail
         FROM books ORDER BY last_read DESC"
    )?;

    let books = stmt.query_map([], |row| {
        Ok(Book {
            id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            file_path: row.get(3)?,
            total_pages: row.get(4)?,
            current_page: row.get(5)?,
            progress: row.get(6)?,
            last_read: row.get(7)?,
            added_at: row.get(8)?,
            cover_thumbnail: row.get(9)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    Ok(books)
}

pub fn get_book(conn: &Connection, id: &str) -> Result<Option<Book>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, author, file_path, total_pages, current_page, progress, last_read, added_at, cover_thumbnail
         FROM books WHERE id = ?1"
    )?;

    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(Book {
            id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            file_path: row.get(3)?,
            total_pages: row.get(4)?,
            current_page: row.get(5)?,
            progress: row.get(6)?,
            last_read: row.get(7)?,
            added_at: row.get(8)?,
            cover_thumbnail: row.get(9)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn remove_book(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM bookmarks WHERE book_id = ?1", params![id])?;
    conn.execute("DELETE FROM reading_sessions WHERE book_id = ?1", params![id])?;
    conn.execute("DELETE FROM books WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_progress(conn: &Connection, book_id: &str, current_page: i64, total_pages: i64) -> Result<()> {
    let progress = if total_pages > 0 {
        (current_page as f64 / total_pages as f64) * 100.0
    } else {
        0.0
    };

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE books SET current_page = ?1, total_pages = ?2, progress = ?3, last_read = ?4 WHERE id = ?5",
        params![current_page, total_pages, progress, now, book_id],
    )?;

    conn.execute(
        "INSERT OR REPLACE INTO reading_sessions (book_id, current_page, scroll_position, scale, rotation, last_read)
         VALUES (?1, ?2, 0.0, 1.0, 0, ?3)",
        params![book_id, current_page, now],
    )?;

    Ok(())
}

pub fn add_bookmark(conn: &Connection, bookmark: &Bookmark) -> Result<()> {
    conn.execute(
        "INSERT INTO bookmarks (id, book_id, page, title, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![bookmark.id, bookmark.book_id, bookmark.page, bookmark.title, bookmark.created_at],
    )?;
    Ok(())
}

pub fn remove_bookmark(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM bookmarks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_bookmarks(conn: &Connection, book_id: &str) -> Result<Vec<Bookmark>> {
    let mut stmt = conn.prepare(
        "SELECT id, book_id, page, title, created_at FROM bookmarks WHERE book_id = ?1 ORDER BY page ASC"
    )?;

    let bookmarks = stmt.query_map(params![book_id], |row| {
        Ok(Bookmark {
            id: row.get(0)?,
            book_id: row.get(1)?,
            page: row.get(2)?,
            title: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    Ok(bookmarks)
}

pub fn get_reading_session(conn: &Connection, book_id: &str) -> Result<Option<ReadingSession>> {
    let mut stmt = conn.prepare(
        "SELECT book_id, current_page, scroll_position, scale, rotation, last_read
         FROM reading_sessions WHERE book_id = ?1"
    )?;

    let mut rows = stmt.query(params![book_id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(ReadingSession {
            book_id: row.get(0)?,
            current_page: row.get(1)?,
            scroll_position: row.get(2)?,
            scale: row.get(3)?,
            rotation: row.get(4)?,
            last_read: row.get(5)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn export_all_data(conn: &Connection) -> Result<String> {
    let books = get_all_books(conn)?;
    let mut all_bookmarks = Vec::new();
    for book in &books {
        let bms = get_bookmarks(conn, &book.id)?;
        all_bookmarks.extend(bms);
    }

    let mut all_sessions = Vec::new();
    for book in &books {
        if let Some(session) = get_reading_session(conn, &book.id)? {
            all_sessions.push(session);
        }
    }

    let data = serde_json::json!({
        "books": books,
        "bookmarks": all_bookmarks,
        "readingSessions": all_sessions,
    });

    serde_json::to_string_pretty(&data)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
}

pub fn import_all_data(conn: &Connection, json_data: &str) -> Result<()> {
    let data: serde_json::Value = serde_json::from_str(json_data)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    if let Some(books) = data["books"].as_array() {
        for book_val in books {
            let book: Book = serde_json::from_value(book_val.clone())
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            import_book(conn, &book)?;
        }
    }

    if let Some(bookmarks) = data["bookmarks"].as_array() {
        for bm_val in bookmarks {
            let bm: Bookmark = serde_json::from_value(bm_val.clone())
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            // allow import to be idempotent
            let _ = conn.execute(
                "INSERT OR REPLACE INTO bookmarks (id, book_id, page, title, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![bm.id, bm.book_id, bm.page, bm.title, bm.created_at],
            );
        }
    }

    if let Some(sessions) = data["readingSessions"].as_array() {
        for s_val in sessions {
            if let Ok(sess) = serde_json::from_value::<ReadingSession>(s_val.clone()) {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO reading_sessions (book_id, current_page, scroll_position, scale, rotation, last_read) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![sess.book_id, sess.current_page, sess.scroll_position, sess.scale, sess.rotation, sess.last_read],
                );
            }
        }
    } else if let Some(sessions_map) = data["readingSessions"].as_object() {
        for (_key, s_val) in sessions_map {
            if let Ok(sess) = serde_json::from_value::<ReadingSession>(s_val.clone()) {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO reading_sessions (book_id, current_page, scroll_position, scale, rotation, last_read) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![sess.book_id, sess.current_page, sess.scroll_position, sess.scale, sess.rotation, sess.last_read],
                );
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("failed to open in-memory db");
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'Unknown',
                file_path TEXT NOT NULL,
                total_pages INTEGER NOT NULL DEFAULT 0,
                current_page INTEGER NOT NULL DEFAULT 0,
                progress REAL NOT NULL DEFAULT 0.0,
                last_read TEXT,
                added_at TEXT NOT NULL,
                cover_thumbnail TEXT
            );

            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                page INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reading_sessions (
                book_id TEXT PRIMARY KEY,
                current_page INTEGER NOT NULL DEFAULT 1,
                scroll_position REAL NOT NULL DEFAULT 0.0,
                scale REAL NOT NULL DEFAULT 1.0,
                rotation INTEGER NOT NULL DEFAULT 0,
                last_read TEXT NOT NULL,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );
            "
        )
        .expect("failed to initialize schema");
        conn
    }

    #[test]
    fn export_and_import_data_roundtrip() {
        let conn = setup_conn();
        let book = Book {
            id: "book-1".into(),
            title: "Book".into(),
            author: "Author".into(),
            file_path: "/tmp/book.pdf".into(),
            total_pages: 100,
            current_page: 10,
            progress: 10.0,
            last_read: Some("2026-01-01T00:00:00Z".into()),
            added_at: "2026-01-01T00:00:00Z".into(),
            cover_thumbnail: None,
        };
        import_book(&conn, &book).expect("failed to import book");
        add_bookmark(
            &conn,
            &Bookmark {
                id: "bm-1".into(),
                book_id: "book-1".into(),
                page: 10,
                title: "Start".into(),
                created_at: "2026-01-01T00:00:00Z".into(),
            },
        )
        .expect("failed to insert bookmark");

        let exported = export_all_data(&conn).expect("failed to export");
        conn.execute("DELETE FROM bookmarks", []).expect("cleanup bookmarks");
        conn.execute("DELETE FROM books", []).expect("cleanup books");

        import_all_data(&conn, &exported).expect("failed to import backup");
        assert_eq!(get_all_books(&conn).expect("books").len(), 1);
        assert_eq!(get_bookmarks(&conn, "book-1").expect("bookmarks").len(), 1);
    }

    #[test]
    fn import_all_data_rejects_invalid_json() {
        let conn = setup_conn();
        let result = import_all_data(&conn, "{not-json}");
        assert!(result.is_err());
    }
}
