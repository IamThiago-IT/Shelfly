mod db;

use db::{Book, Bookmark, ReadingSession};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

struct AppState {
    db: Mutex<Connection>,
}

fn with_db<T, F>(app: &AppHandle, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> rusqlite::Result<T>,
{
    let state = app.state::<AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    f(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> String {
    let path = app.path().app_data_dir().unwrap_or_default();
    path.to_string_lossy().to_string()
}

#[tauri::command]
fn add_book(app: AppHandle, book: Book) -> Result<(), String> {
    with_db(&app, |db| db::import_book(db, &book))
}

#[tauri::command]
fn get_library(app: AppHandle) -> Result<Vec<Book>, String> {
    with_db(&app, db::get_all_books)
}

#[tauri::command]
fn get_book(app: AppHandle, id: String) -> Result<Option<Book>, String> {
    with_db(&app, |db| db::get_book(db, &id))
}

#[tauri::command]
fn remove_book(app: AppHandle, id: String) -> Result<(), String> {
    with_db(&app, |db| db::remove_book(db, &id))
}

#[tauri::command]
fn save_progress(app: AppHandle, book_id: String, current_page: i64, total_pages: i64) -> Result<(), String> {
    with_db(&app, |db| db::update_progress(db, &book_id, current_page, total_pages))
}

#[tauri::command]
fn add_bookmark(app: AppHandle, bookmark: Bookmark) -> Result<(), String> {
    with_db(&app, |db| db::add_bookmark(db, &bookmark))
}

#[tauri::command]
fn remove_bookmark(app: AppHandle, id: String) -> Result<(), String> {
    with_db(&app, |db| db::remove_bookmark(db, &id))
}

#[tauri::command]
fn get_bookmarks(app: AppHandle, book_id: String) -> Result<Vec<Bookmark>, String> {
    with_db(&app, |db| db::get_bookmarks(db, &book_id))
}

#[tauri::command]
fn get_reading_session(app: AppHandle, book_id: String) -> Result<Option<ReadingSession>, String> {
    with_db(&app, |db| db::get_reading_session(db, &book_id))
}

#[tauri::command]
fn export_backup(app: AppHandle) -> Result<String, String> {
    with_db(&app, db::export_all_data)
}

#[tauri::command]
fn import_backup(app: AppHandle, data: String) -> Result<(), String> {
    with_db(&app, |db| db::import_all_data(db, &data))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            let db_path = db::get_db_path(&app_data_dir);
            let conn = db::init_db(&db_path).expect("Failed to initialize database");
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            add_book,
            get_library,
            get_book,
            remove_book,
            save_progress,
            add_bookmark,
            remove_bookmark,
            get_bookmarks,
            get_reading_session,
            export_backup,
            import_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
