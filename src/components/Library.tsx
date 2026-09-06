import { useRef, useState, useEffect } from 'react'
import { Upload, Library as LibraryIcon, ArrowUpDown } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { BookCard } from './BookCard'
import { generateId } from '../lib/utils'
import { getPDFMeta, generateThumbnail } from '../lib/pdf'
import { isTauri, pickPDFFiles, copyFileToAppDir } from '../lib/tauri'
import { savePDF, saveMetadata } from '../lib/pdfStorage'
import { readFileAsDataUrl } from '../lib/tauri'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { ScrollArea } from './ui/scroll-area'
import { CommandPalette } from './CommandPalette'

export function Library() {
  const books = useAppStore((s) => s.books)
  const addBooks = useAppStore((s) => s.addBooks)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const sortBy = useAppStore((s) => s.sortBy)
  const setSortBy = useAppStore((s) => s.setSortBy)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)

  // debounce search input -> store
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput, setSearchQuery])
  useEffect(() => setSearchInput(searchQuery), [searchQuery])

  const filteredBooks = (() => {
    let filtered = books
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
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
  })()

  useEffect(() => {
    const handler = () => setCommandOpen(true)
    window.addEventListener('open-command-palette', handler)
    return () => window.removeEventListener('open-command-palette', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    setImporting(true)
    const newBooks: import('../types').Book[] = []

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) continue
      const blobUrl = URL.createObjectURL(file)
      try {
        const meta = await getPDFMeta(blobUrl)
        const thumbnail = await generateThumbnail(blobUrl, 150)
        const bookId = generateId()

        let persistedPath: string
        if (!isTauri()) {
          const arrayBuffer = await file.arrayBuffer()
          await savePDF(bookId, arrayBuffer)
          await saveMetadata({
            id: bookId,
            title: meta.title,
            author: meta.author,
            totalPages: meta.totalPages,
            coverThumbnail: thumbnail || undefined,
            savedAt: new Date().toISOString(),
          })
          // persist as indexedDB key, not blob URL - stable across reloads
          persistedPath = `indexeddb://${bookId}`
        } else {
          persistedPath = blobUrl
        }

        newBooks.push({
          id: bookId,
          title: meta.title,
          author: meta.author,
          filePath: persistedPath,
          totalPages: meta.totalPages,
          currentPage: 0,
          progress: 0,
          lastRead: null,
          addedAt: new Date().toISOString(),
          coverThumbnail: thumbnail || undefined,
        })
      } catch (err) {
        console.error(`Failed to load PDF: ${file.name}`, err)
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    }

    if (newBooks.length > 0) addBooks(newBooks)
    // reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
    setImporting(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      // convert FileList from DataTransfer to handle via handleFileSelect
      const dtFiles = files as unknown as FileList
      await handleFileSelect(dtFiles)
    }
  }

  async function handleTauriImport() {
    if (!isTauri()) {
      fileInputRef.current?.click()
      return
    }
    setImporting(true)
    try {
      const paths = await pickPDFFiles()
      for (const sourcePath of paths) {
        const destPath = await copyFileToAppDir(sourcePath)
        // read as blob URL for pdf.js in Tauri (uses file path via fs)
        const blobUrl = await readFileAsDataUrl(destPath)
        let meta
        let thumbnail
        try {
          meta = await getPDFMeta(blobUrl)
          thumbnail = await generateThumbnail(blobUrl, 150)
        } finally {
          // keep tracked URL for cleanup, will be revoked on next load via trackObjectUrl
        }
        addBooks([{
          id: generateId(),
          title: meta.title,
          author: meta.author,
          filePath: destPath,
          totalPages: meta.totalPages,
          currentPage: 0,
          progress: 0,
          lastRead: null,
          addedAt: new Date().toISOString(),
          coverThumbnail: thumbnail || undefined,
        }])
      }
    } catch (err) {
      console.error('Import failed:', err)
    }
    setImporting(false)
  }

  return (
    <>
      <div
        className="flex-1 flex flex-col h-full"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-30 bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary/30 flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center">
              <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Drop PDFs here</p>
              <p className="text-xs text-muted-foreground">Release to import</p>
            </div>
          </div>
        )}
        <header className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Library</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
              </p>
            </div>
            <Button onClick={handleTauriImport} disabled={importing} className="gap-2 w-full sm:w-auto">
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import PDF'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Input
                ref={searchRef}
                type="text"
                placeholder="Search by title or author..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'lastRead' | 'title' | 'progress')}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastRead">Last Read</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <LibraryIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {searchQuery ? 'No results found' : 'Your library is empty'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery
                  ? `No books matching "${searchQuery}"`
                  : 'Import PDF files to start reading'}
              </p>
              {!searchQuery && (
                <Button onClick={handleTauriImport} className="mt-6 gap-2">
                  <Upload className="w-4 h-4" />
                  Import your first PDF
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
