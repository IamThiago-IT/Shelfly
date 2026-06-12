mod db;

use db::{Book, Bookmark, ReadingSession};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

struct AppState {
    db: Mutex<Connection>,
}

fn get_db(app: &AppHandle) -> tauri::Result<std::sync::MutexGuard<'_, Connection>> {
    let state = app.state::<AppState>();
    Ok(state.db.lock().unwrap())
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> String {
    let path = app.path().app_data_dir().unwrap_or_default();
    path.to_string_lossy().to_string()
}

#[tauri::command]
fn add_book(app: AppHandle, book: Book) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::import_book(&db, &book).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_library(app: AppHandle) -> Result<Vec<Book>, String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::get_all_books(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_book(app: AppHandle, id: String) -> Result<Option<Book>, String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::get_book(&db, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_book(app: AppHandle, id: String) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::remove_book(&db, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_progress(app: AppHandle, book_id: String, current_page: i64, total_pages: i64) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::update_progress(&db, &book_id, current_page, total_pages).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_bookmark(app: AppHandle, bookmark: Bookmark) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::add_bookmark(&db, &bookmark).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_bookmark(app: AppHandle, id: String) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::remove_bookmark(&db, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_bookmarks(app: AppHandle, book_id: String) -> Result<Vec<Bookmark>, String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::get_bookmarks(&db, &book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_reading_session(app: AppHandle, book_id: String) -> Result<Option<ReadingSession>, String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::get_reading_session(&db, &book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_backup(app: AppHandle) -> Result<String, String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::export_all_data(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_backup(app: AppHandle, data: String) -> Result<(), String> {
    let db = get_db(&app).map_err(|e| e.to_string())?;
    db::import_all_data(&db, &data).map_err(|e| e.to_string())
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
