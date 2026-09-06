import { Bookmark, BookOpen } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'

export function BookmarksView() {
  const bookmarks = useAppStore((s) => s.bookmarks)
  const books = useAppStore((s) => s.books)
  const openBook = useAppStore((s) => s.openBook)
  const removeBookmark = useAppStore((s) => s.removeBookmark)

  const grouped = bookmarks.reduce<Record<string, typeof bookmarks>>((acc, bm) => {
    if (!acc[bm.bookId]) acc[bm.bookId] = []
    acc[bm.bookId].push(bm)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-border shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bookmarks</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'} across {Object.keys(grouped).length} books
        </p>
      </header>
      <ScrollArea className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No bookmarks yet</h3>
            <p className="text-sm text-muted-foreground">Press Ctrl+B in reader to bookmark a page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([bookId, bms]) => {
              const book = books.find((b) => b.id === bookId)
              return (
                <div key={bookId} className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{book?.title ?? 'Unknown book'}</p>
                        <p className="text-xs text-muted-foreground truncate">{book?.author}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openBook(bookId)} disabled={!book}>
                      Open
                    </Button>
                  </div>
                  <div className="divide-y divide-border/50">
                    {bms
                      .sort((a, b) => a.page - b.page)
                      .map((bm) => (
                        <div key={bm.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{bm.title}</p>
                            <p className="text-xs text-muted-foreground">Page {bm.page}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (book) {
                                  useAppStore.getState().updateProgress(book.id, bm.page, book.totalPages)
                                  openBook(book.id)
                                }
                              }}
                            >
                              Go
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBookmark(bm.id)}>
                              <Bookmark className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
