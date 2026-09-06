import { History } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { BookCard } from './BookCard'
import { ScrollArea } from './ui/scroll-area'

export function RecentView() {
  const getRecentBooks = useAppStore((s) => s.getRecentBooks)
  const recent = getRecentBooks()

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-border shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Recent</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {recent.length} {recent.length === 1 ? 'book' : 'books'} recently read
        </p>
      </header>
      <ScrollArea className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
        {recent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {recent.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No recent books</h3>
            <p className="text-sm text-muted-foreground">Open a book to see it here</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
