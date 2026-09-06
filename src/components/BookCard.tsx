import { BookOpen, MoreHorizontal, Trash2, BookmarkPlus, Download, Check, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Book } from '../types'
import { formatDate } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { isTauri } from '../lib/tauri'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const openBook = useAppStore((s) => s.openBook)
  const removeBook = useAppStore((s) => s.removeBook)
  const addBookmark = useAppStore((s) => s.addBookmark)
  const saveBookOffline = useAppStore((s) => s.saveBookOffline)
  const removeBookOffline = useAppStore((s) => s.removeBookOffline)
  const isBookAvailableOffline = useAppStore((s) => s.isBookAvailableOffline)
  const [imgError, setImgError] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isTauri()) {
      let alive = true
      isBookAvailableOffline(book.id).then((v) => {
        if (alive) setIsOffline(v)
      })
      return () => {
        alive = false
      }
    }
  }, [book.id])

  async function handleToggleOffline() {
    setSaving(true)
    try {
      if (isOffline) {
        await removeBookOffline(book.id)
        setIsOffline(false)
      } else {
        await saveBookOffline(book.id)
        setIsOffline(true)
      }
    } catch (error) {
      console.error('Failed to toggle offline:', error)
    }
    setSaving(false)
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer border-border/50">
      <div onClick={() => openBook(book.id)}>
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          {book.coverThumbnail && !imgError ? (
            <img
              src={book.coverThumbnail}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <BookOpen className="w-12 h-12" />
                <span className="text-[10px] font-medium uppercase tracking-wider">PDF</span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg text-foreground text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              Read
            </div>
          </div>

          <div className="absolute top-2 left-2">
            {book.progress > 0 && (
              <Badge variant={book.progress === 100 ? 'success' : 'progress'}>
                {book.progress}%
              </Badge>
            )}
            {isOffline && (
              <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <Check className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        <div className="p-2.5 sm:p-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-card-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>

          <div className="pt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${book.progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {book.lastRead ? formatDate(book.lastRead) : 'Not started'}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {book.totalPages} p.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => openBook(book.id)}>
              <BookOpen className="w-4 h-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                addBookmark(book.id, book.currentPage || 1)
              }}
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Add Bookmark
            </DropdownMenuItem>
            {!isTauri() && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleOffline()
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isOffline ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : isOffline ? 'Saved Offline' : 'Save Offline'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                removeBook(book.id)
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
