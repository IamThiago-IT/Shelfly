import { useAppStore } from '../store/appStore'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { BookOpen, History, Bookmark, Search } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const books = useAppStore((s) => s.books)
  const openBook = useAppStore((s) => s.openBook)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  const recentBooks = books.filter((b) => b.lastRead).slice(0, 5)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search books, pages, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              setCurrentView('library')
              setSearchQuery('')
              onOpenChange(false)
            }}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span>Browse Library</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCurrentView('library')
              onOpenChange(false)
            }}
          >
            <History className="w-4 h-4 mr-2" />
            <span>View Recent</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCurrentView('library')
              onOpenChange(false)
            }}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            <span>View Bookmarks</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Books">
          {recentBooks.map((book) => (
            <CommandItem
              key={book.id}
              onSelect={() => {
                openBook(book.id)
                onOpenChange(false)
              }}
            >
              <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="truncate block">{book.title}</span>
                <span className="text-xs text-muted-foreground">
                  {book.progress}% complete
                </span>
              </div>
            </CommandItem>
          ))}
          {books.length > 5 && (
            <CommandItem
              onSelect={() => {
                setCurrentView('library')
                onOpenChange(false)
              }}
            >
              <Search className="w-4 h-4 mr-2" />
              <span>Search all {books.length} books...</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
