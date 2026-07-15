import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, Bookmark, ViewMode, SortBy, Theme, View, ReadingSession } from '../types'
import { generateId } from '../lib/utils'
import { savePDF, deletePDF, hasPDF, saveMetadata, deleteMetadata } from '../lib/pdfStorage'
import { isTauri, readFileAsArrayBuffer } from '../lib/tauri'

interface AppState {
  currentView: View
  currentBookId: string | null
  sidebarOpen: boolean

  books: Book[]
  bookmarks: Bookmark[]
  readingSessions: Record<string, ReadingSession>

  searchQuery: string
  sortBy: SortBy

  readerMode: ViewMode
  theme: Theme
  scale: number
  brightness: number
  fontSize: number

  setCurrentView: (view: View) => void
  openBook: (id: string) => void
  closeBook: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  addBooks: (books: Book[]) => void
  removeBook: (id: string) => void
  updateProgress: (bookId: string, page: number, totalPages: number) => void
  updateBookMeta: (bookId: string, meta: { title?: string; author?: string; totalPages?: number }) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: SortBy) => void

  setReaderMode: (mode: ViewMode) => void
  setScale: (scale: number) => void
  setBrightness: (brightness: number) => void
  setFontSize: (size: number) => void
  setTheme: (theme: Theme) => void

  addBookmark: (bookId: string, page: number, title?: string) => void
  removeBookmark: (id: string) => void
  updateBookmarkTitle: (id: string, title: string) => void

  updateSession: (session: Partial<ReadingSession> & { bookId: string }) => void
  getSession: (bookId: string) => ReadingSession | undefined

  exportData: () => string
  importData: (json: string) => void

  getFilteredBooks: () => Book[]
  getCurrentBook: () => Book | undefined
  getRecentBooks: () => Book[]
  getBookmarksForBook: (bookId: string) => Bookmark[]

  saveBookOffline: (bookId: string) => Promise<void>
  removeBookOffline: (bookId: string) => Promise<void>
  isBookAvailableOffline: (bookId: string) => Promise<boolean>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'library',
      currentBookId: null,
      sidebarOpen: true,

      books: [],
      bookmarks: [],
      readingSessions: {},

      searchQuery: '',
      sortBy: 'lastRead',

      readerMode: 'continuous',
      theme: 'system',
      scale: 1,
      brightness: 100,
      fontSize: 16,

      setCurrentView: (view) => set({ currentView: view }),

      openBook: (id) => {
        const book = get().books.find((b) => b.id === id)
        if (book) {
          set({
            currentBookId: id,
            currentView: 'reader',
            sidebarOpen: false,
          })
        }
      },

      closeBook: () => set({ currentBookId: null, currentView: 'library' }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      addBooks: (newBooks) =>
        set((s) => ({
          books: [...s.books, ...newBooks.filter((b) => !s.books.find((existing) => existing.id === b.id))],
        })),

      removeBook: (id) =>
        set((s) => ({
          books: s.books.filter((b) => b.id !== id),
          bookmarks: s.bookmarks.filter((bm) => bm.bookId !== id),
          readingSessions: Object.fromEntries(
            Object.entries(s.readingSessions).filter(([key]) => key !== id),
          ),
        })),

      updateProgress: (bookId, page, totalPages) =>
        set((s) => {
          const progress = Math.round((page / totalPages) * 100)
          return {
            books: s.books.map((b) =>
              b.id === bookId
                ? { ...b, currentPage: page, totalPages, progress, lastRead: new Date().toISOString() }
                : b,
            ),
            readingSessions: {
              ...s.readingSessions,
              [bookId]: {
                ...(s.readingSessions[bookId] || { scrollPosition: 0, scale: 1, rotation: 0 }),
                bookId,
                currentPage: page,
                lastRead: new Date().toISOString(),
              },
            },
          }
        }),

      updateBookMeta: (bookId, meta) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === bookId ? { ...b, ...meta } : b)),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSortBy: (sort) => set({ sortBy: sort }),

      setReaderMode: (mode) => set({ readerMode: mode }),

      setScale: (scale) => set({ scale }),

      setBrightness: (brightness) => set({ brightness }),

      setFontSize: (size) => set({ fontSize: size }),

      setTheme: (theme) => set({ theme }),

      addBookmark: (bookId, page, title) =>
        set((s) => ({
          bookmarks: [
            ...s.bookmarks,
            {
              id: generateId(),
              bookId,
              page,
              title: title || `Page ${page}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.filter((bm) => bm.id !== id),
        })),

      updateBookmarkTitle: (id, title) =>
        set((s) => ({
          bookmarks: s.bookmarks.map((bm) => (bm.id === id ? { ...bm, title } : bm)),
        })),

      updateSession: (session) =>
        set((s) => ({
          readingSessions: {
            ...s.readingSessions,
            [session.bookId]: {
              ...(s.readingSessions[session.bookId] || {
                currentPage: 1,
                scrollPosition: 0,
                scale: 1,
                rotation: 0,
                lastRead: new Date().toISOString(),
              }),
              ...session,
            },
          },
        })),

      getSession: (bookId) => get().readingSessions[bookId],

      exportData: () => {
        const { books, bookmarks, readingSessions } = get()
        return JSON.stringify({ books, bookmarks, readingSessions })
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            books: data.books || [],
            bookmarks: data.bookmarks || [],
            readingSessions: data.readingSessions || {},
          })
        } catch {
          console.error('Failed to import data')
        }
      },

      getFilteredBooks: () => {
        const { books, searchQuery, sortBy } = get()
        let filtered = books

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          filtered = filtered.filter(
            (b) =>
              b.title.toLowerCase().includes(q) ||
              b.author.toLowerCase().includes(q),
          )
        }

        switch (sortBy) {
          case 'lastRead':
            return [...filtered].sort((a, b) => {
              if (!a.lastRead) return 1
              if (!b.lastRead) return -1
              return new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
            })
          case 'title':
            return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
          case 'progress':
            return [...filtered].sort((a, b) => b.progress - a.progress)
          default:
            return filtered
        }
      },

      getCurrentBook: () => {
        const { books, currentBookId } = get()
        return books.find((b) => b.id === currentBookId)
      },

      getRecentBooks: () => {
        return get()
          .books.filter((b) => b.lastRead)
          .sort((a, b) => {
            if (!a.lastRead) return 1
            if (!b.lastRead) return -1
            return new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
          })
          .slice(0, 10)
      },

      getBookmarksForBook: (bookId) => {
        return get()
          .bookmarks.filter((bm) => bm.bookId === bookId)
          .sort((a, b) => a.page - b.page)
      },

      saveBookOffline: async (bookId) => {
        const book = get().books.find((b) => b.id === bookId)
        if (!book || isTauri()) return

        try {
          const arrayBuffer = await readFileAsArrayBuffer(book.filePath)
          await savePDF(bookId, arrayBuffer)
          await saveMetadata({
            id: bookId,
            title: book.title,
            author: book.author,
            totalPages: book.totalPages,
            coverThumbnail: book.coverThumbnail,
            savedAt: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Failed to save PDF offline:", error)
        }
      },

      removeBookOffline: async (bookId) => {
        if (isTauri()) return
        try {
          await deletePDF(bookId)
          await deleteMetadata(bookId)
        } catch (error) {
          console.error("Failed to remove PDF offline:", error)
        }
      },

      isBookAvailableOffline: async (bookId) => {
        if (isTauri()) return false
        try {
          return await hasPDF(bookId)
        } catch {
          return false
        }
      },
    }),
    {
      name: 'shelfly-storage',
      partialize: (state) => ({
        books: state.books,
        bookmarks: state.bookmarks,
        readingSessions: state.readingSessions,
        theme: state.theme,
        readerMode: state.readerMode,
        scale: state.scale,
        brightness: state.brightness,
        fontSize: state.fontSize,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
)
