# Shelfly

A modern, cross-platform PDF reader built with **Tauri 2**, **React**, **TypeScript**, and **shadcn/ui**.

Designed for a comfortable digital reading experience with automatic progress saving, bookmarks, dark mode, and keyboard shortcuts.

![Tech Stack](https://img.shields.io/badge/Tauri-2.0-ffc131?logo=tauri)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-000000)

---

## Features

### 📚 Library
- Grid of imported PDFs with first-page thumbnails
- Title, author, last read, progress %, total pages
- Search by title/author
- Sort by last read, title, or progress
- Import multiple PDFs at once (native file dialog in Tauri)

### 📖 PDF Reader
- Fluid rendering with pdf.js
- Continuous scroll mode and single-page mode
- Auto-save progress (page + position every 3s)
- Zoom, rotation, brightness adjustment
- Light / dark / system theme
- Fullscreen with keyboard shortcuts

### 🔖 Bookmarks
- Add, edit, and remove bookmarks per book
- Sidebar list with page numbers
- Jump directly to bookmarked pages

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `→` / `←` | Next / previous page |
| `Space` | Next page (single mode) |
| `F` | Toggle fullscreen |
| `M` | Toggle scroll / single mode |
| `Ctrl+B` | Add bookmark |
| `Ctrl+G` | Go to page |
| `Ctrl+K` | Command palette |
| `Ctrl++` / `Ctrl+-` | Zoom in / out |
| `Ctrl+0` | Reset zoom |
| `Escape` | Exit fullscreen |

### 💾 Persistence
- Zustand with `persist` middleware (localStorage/IndexedDB)
- Works fully offline
- Tauri backend: SQLite via `rusqlite` for desktop
- Export / Import backup of all data

---

## Project Structure

```
shelfly/
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Root (theme sync)
│   ├── index.css                    # Tailwind + shadcn CSS vars
│   ├── types/index.ts               # TypeScript interfaces
│   ├── store/appStore.ts            # Zustand store + persist
│   ├── lib/
│   │   ├── utils.ts                 # cn(), formatDate(), etc.
│   │   ├── pdf.ts                   # pdf.js (load, render, thumbnail)
│   │   ├── tauri.ts                 # Tauri API wrappers
│   │   └── keyboard.ts              # useKeyboardShortcuts hook
│   └── components/
│       ├── Layout.tsx               # App shell
│       ├── Sidebar.tsx              # Collapsible navigation
│       ├── Library.tsx              # Book grid + search + import
│       ├── BookCard.tsx             # Book card with progress
│       ├── Reader.tsx               # PDF reader (main)
│       ├── Bookmarks.tsx            # Bookmark list
│       ├── CommandPalette.tsx       # Ctrl+K search palette
│       └── ui/                      # shadcn/ui components
│           ├── button.tsx
│           ├── card.tsx
│           ├── dialog.tsx
│           ├── dropdown-menu.tsx
│           ├── input.tsx
│           ├── scroll-area.tsx
│           ├── select.tsx
│           ├── separator.tsx
│           ├── sheet.tsx
│           ├── tooltip.tsx
│           ├── badge.tsx
│           ├── command.tsx
│           ├── tabs.tsx
│           ├── toggle.tsx
│           ├── label.tsx
│           └── avatar.tsx
├── src-tauri/
│   ├── Cargo.toml                   # Rust dependencies
│   ├── tauri.conf.json              # Window, bundle config
│   ├── capabilities/default.json    # Permissions
│   └── src/
│       ├── main.rs                  # Entry (Windows fix)
│       ├── lib.rs                   # 12 Tauri commands
│       └── db.rs                    # SQLite (init, CRUD, backup)
├── tailwind.config.js
├── postcss.config.js
├── components.json                  # shadcn/ui config
├── vite.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (or **Bun**)
- **Rust** toolchain (only for desktop builds)

### Install

```bash
# Clone the repo
cd shelfly

# Install frontend dependencies
bun install

# (Optional) Install Rust dependencies
cd src-tauri && cargo check && cd ..
```

### Run (Web / PWA)

```bash
bun dev
# Opens at http://localhost:1420
```

### Run (Desktop)

```bash
bun tauri dev
```

### Build for Production

```bash
bun run build           # Frontend only
bun tauri build         # Desktop installer
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State | Zustand 5 (persist) |
| PDF Engine | pdfjs-dist 4 |
| Icons | Lucide React |
| Desktop | Tauri 2 (Rust) |
| Database | SQLite (rusqlite) |
| Plugins | dialog, fs, opener |

---

## Tauri Commands (Rust Backend)

| Command | Description |
|---------|-------------|
| `get_app_data_dir` | Returns the app data directory path |
| `add_book` | Insert a book into the library |
| `get_library` | Get all books |
| `get_book` | Get a single book by ID |
| `remove_book` | Remove a book and its data |
| `save_progress` | Update reading progress |
| `add_bookmark` | Add a bookmark |
| `remove_bookmark` | Remove a bookmark |
| `get_bookmarks` | Get bookmarks for a book |
| `get_reading_session` | Get saved reading session |
| `export_backup` | Export all data as JSON |
| `import_backup` | Import data from JSON |

---

## Roadmap

- [x] Library with search & sort
- [x] PDF reader (continuous + single page)
- [x] Auto-save progress
- [x] Bookmarks
- [x] Dark mode
- [x] Keyboard shortcuts
- [x] Command palette (Ctrl+K)
- [ ] Drag & drop import
- [ ] PWA support
- [ ] Reading statistics
- [ ] Folder import
- [ ] Text-to-speech
- [ ] Annotation/highlighting
- [ ] Mobile responsive layout

---

## License

MIT
