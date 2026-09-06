export interface Book {
  id: string
  title: string
  author: string
  filePath: string
  totalPages: number
  currentPage: number
  progress: number
  lastRead: string | null
  addedAt: string
  coverThumbnail?: string
}

export interface Bookmark {
  id: string
  bookId: string
  page: number
  title: string
  createdAt: string
}

export interface ReadingSession {
  bookId: string
  currentPage: number
  scrollPosition: number
  scale: number
  rotation: number
  lastRead: string
}

export type ViewMode = 'continuous' | 'single'
export type SortBy = 'lastRead' | 'title' | 'progress'
export type Theme = 'system' | 'light' | 'dark'
export type View = 'library' | 'reader' | 'recent' | 'bookmarks'
