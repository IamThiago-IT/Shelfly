import { useState } from 'react'
import { Bookmark, Trash2, Edit3, Check, X, BookOpen, Pin } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

export function Bookmarks() {
  const currentBookId = useAppStore((s) => s.currentBookId)
  const getBookmarksForBook = useAppStore((s) => s.getBookmarksForBook)
  const removeBookmark = useAppStore((s) => s.removeBookmark)
  const updateBookmarkTitle = useAppStore((s) => s.updateBookmarkTitle)
  const updateProgress = useAppStore((s) => s.updateProgress)
  const getCurrentBook = useAppStore((s) => s.getCurrentBook)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const bookmarks = currentBookId ? getBookmarksForBook(currentBookId) : []
  const currentBook = getCurrentBook()

  function startEdit(id: string, title: string) {
    setEditingId(id)
    setEditTitle(title)
  }

  function saveEdit() {
    if (editingId && editTitle.trim()) {
      updateBookmarkTitle(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  function goToPage(page: number) {
    if (currentBook) {
      updateProgress(currentBook.id, page, currentBook.totalPages)
    }
  }

  if (!currentBook) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Bookmark className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No book selected</p>
        <p className="text-xs text-muted-foreground mt-1">Open a book to see bookmarks</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          Bookmarks
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-sm text-muted-foreground">No bookmarks yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">Ctrl+B</kbd> to bookmark
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Pin className="w-3.5 h-3.5 text-primary shrink-0 mt-1 fill-primary/20" />

                <div className="flex-1 min-w-0">
                  {editingId === bm.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={saveEdit}>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {bm.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Page {bm.page}</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goToPage(bm.page)}
                    title="Go to page"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(bm.id, bm.title)}
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-destructive"
                    onClick={() => removeBookmark(bm.id)}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
