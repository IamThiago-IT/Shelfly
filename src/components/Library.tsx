import { useRef, useState, useEffect } from 'react'
import { Upload, Library as LibraryIcon, ArrowUpDown } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { BookCard } from './BookCard'
import { generateId } from '../lib/utils'
import { getPDFMeta, generateThumbnail } from '../lib/pdf'
import { isTauri, pickPDFFiles, copyFileToAppDir } from '../lib/tauri'
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
  const getFilteredBooks = useAppStore((s) => s.getFilteredBooks)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const filteredBooks = getFilteredBooks()

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
      const filePath = URL.createObjectURL(file)
      try {
        const meta = await getPDFMeta(filePath)
        const thumbnail = await generateThumbnail(filePath, 150)
        newBooks.push({
          id: generateId(),
          title: meta.title,
          author: meta.author,
          filePath,
          totalPages: meta.totalPages,
          currentPage: 0,
          progress: 0,
          lastRead: null,
          addedAt: new Date().toISOString(),
          coverThumbnail: thumbnail || undefined,
        })
      } catch (err) {
        console.error(`Failed to load PDF: ${file.name}`, err)
      }
    }

    if (newBooks.length > 0) addBooks(newBooks)
    setImporting(false)
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
        const meta = await getPDFMeta(destPath)
        const thumbnail = await generateThumbnail(destPath, 150)
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
      <div className="flex-1 flex flex-col h-full">
        <header className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Library</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
              </p>
            </div>
            <Button onClick={handleTauriImport} disabled={importing} className="gap-2">
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

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Input
                ref={searchRef}
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <SelectTrigger className="w-[140px] h-9">
                <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
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

        <ScrollArea className="flex-1 px-6 py-6">
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
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
