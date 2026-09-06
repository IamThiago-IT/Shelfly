import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ZoomIn, ZoomOut, RotateCw, Sun, Moon, Bookmark,
  ChevronLeft, ChevronRight, Maximize, Minimize,
  LayoutGrid, AlignJustify, BookmarkPlus, ArrowLeft, WifiOff,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAppStore } from '../store/appStore'
import { useKeyboardShortcuts } from '../lib/keyboard'
import { clamp, cn } from '../lib/utils'
import { Bookmarks } from './Bookmarks'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getPDF } from '../lib/pdfStorage'
import { isTauri, readFileAsDataUrl } from '../lib/tauri'
import { loadPDFDocumentFromBuffer } from '../lib/pdf'

export function Reader() {
  const currentBook = useAppStore((s) => s.getCurrentBook())
  const currentBookId = useAppStore((s) => s.currentBookId)
  const closeBook = useAppStore((s) => s.closeBook)
  const readerMode = useAppStore((s) => s.readerMode)
  const setReaderMode = useAppStore((s) => s.setReaderMode)
  const scale = useAppStore((s) => s.scale)
  const setScale = useAppStore((s) => s.setScale)
  const brightness = useAppStore((s) => s.brightness)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const updateProgress = useAppStore((s) => s.updateProgress)
  const addBookmark = useAppStore((s) => s.addBookmark)
  const getBookmarksForBook = useAppStore((s) => s.getBookmarksForBook)

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderedPagesRef = useRef<Set<number>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showPageDialog, setShowPageDialog] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { isOffline } = useOnlineStatus()

  const bookmarks = currentBookId ? getBookmarksForBook(currentBookId) : []

  // keep track of blob URLs to revoke
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentBook) return

    let cancelled = false
    const loadPDF = async () => {
      setLoading(true)
      setError(null)
      // cleanup previous blob
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      try {
        let doc: pdfjsLib.PDFDocumentProxy

        // Unified loading: if filePath is indexeddb://, load from IndexedDB buffer
        if (!isTauri() && currentBook.filePath.startsWith('indexeddb://')) {
          const cached = await getPDF(currentBook.id)
          if (!cached) {
            setError('PDF not available offline')
            setLoading(false)
            return
          }
          doc = await loadPDFDocumentFromBuffer(cached)
        } else if (!isTauri() && isOffline) {
          // fallback: filePath may be legacy blob URL, try IndexedDB
          const cachedPDF = await getPDF(currentBook.id)
          if (cachedPDF) {
            doc = await loadPDFDocumentFromBuffer(cachedPDF)
          } else if (currentBook.filePath.startsWith('blob:') || currentBook.filePath.startsWith('http')) {
            const loadingTask = pdfjsLib.getDocument(currentBook.filePath)
            doc = await loadingTask.promise
          } else {
            setError('PDF not available offline')
            setLoading(false)
            return
          }
        } else if (isTauri() && !currentBook.filePath.startsWith('blob:')) {
          // Tauri: filePath is a filesystem path, read via fs API
          const blobUrl = await readFileAsDataUrl(currentBook.filePath)
          if (cancelled) {
            URL.revokeObjectURL(blobUrl)
            return
          }
          blobUrlRef.current = blobUrl
          const loadingTask = pdfjsLib.getDocument(blobUrl)
          doc = await loadingTask.promise
        } else {
          // blob: or http: direct
          const loadingTask = pdfjsLib.getDocument(currentBook.filePath)
          doc = await loadingTask.promise
        }

        if (cancelled) {
          doc.destroy()
          return
        }
        pdfDocRef.current = doc
        setTotalPages(doc.numPages)

        const session = useAppStore.getState().readingSessions[currentBook.id]
        const startPage = session?.currentPage || 1
        setCurrentPage(startPage)
        renderedPagesRef.current.clear()
        await renderPages(startPage)
      } catch (err) {
        console.error('Failed to load PDF:', err)
        const msg = err instanceof Error && err.message.includes('Password') ? 'PDF is password protected' : 'Failed to load PDF'
        setError(msg)
      }
      if (!cancelled) setLoading(false)
    }

    loadPDF()
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      pdfDocRef.current?.destroy()
      pdfDocRef.current = null
      renderedPagesRef.current.clear()
    }
  }, [currentBook?.id, currentBook?.filePath, isOffline])

  // debounce save: only persist when page actually changes, not every 3s blindly
  const lastSavedPageRef = useRef<number | null>(null)
  useEffect(() => {
    if (!currentBookId || !currentBook || totalPages === 0) return
    if (lastSavedPageRef.current === currentPage) return
    const timeout = setTimeout(() => {
      updateProgress(currentBookId, currentPage, totalPages)
      lastSavedPageRef.current = currentPage
    }, 800)
    return () => clearTimeout(timeout)
  }, [currentBookId, currentPage, totalPages, currentBook])

  // also save on unmount / page hide
  useEffect(() => {
    if (!currentBookId || totalPages === 0) return
    return () => {
      if (lastSavedPageRef.current !== currentPage) {
        updateProgress(currentBookId, currentPage, totalPages)
      }
    }
  }, [currentBookId, currentPage, totalPages])

  const renderPages = useCallback(async (startPage: number) => {
    const doc = pdfDocRef.current
    if (!doc || !canvasContainerRef.current) return

    canvasContainerRef.current.innerHTML = ''

    if (readerMode === 'single') {
      const canvas = document.createElement('canvas')
      canvas.className = 'mx-auto shadow-xl rounded-lg bg-card'
      canvasContainerRef.current.appendChild(canvas)

      const page = await doc.getPage(startPage)
      const viewport = page.getViewport({ scale, rotation })
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width / devicePixelRatio}px`
      canvas.style.maxWidth = '100%'

      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise
      }
      renderedPagesRef.current.add(startPage)
      return
    }

    const fragment = document.createDocumentFragment()
    // render more pages in continuous mode, but cap to avoid OOM; 5 was too few for large docs
    const pagesToRender = Math.min(10, doc.numPages - startPage + 1)

    for (let i = 0; i < pagesToRender; i++) {
      const pageNum = startPage + i
      if (pageNum > doc.numPages) break

      const wrapper = document.createElement('div')
      wrapper.className = 'flex flex-col items-center mb-6 last:mb-0'

      const canvas = document.createElement('canvas')
      canvas.className = 'rounded-lg shadow-sm bg-card'
      wrapper.appendChild(canvas)
      fragment.appendChild(wrapper)

      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale, rotation })
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = '100%'
      canvas.style.maxWidth = `${viewport.width / devicePixelRatio}px`
      canvas.style.height = 'auto'

      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise
      }
      renderedPagesRef.current.add(pageNum)
    }

    canvasContainerRef.current.appendChild(fragment)
  }, [scale, rotation, readerMode])

  useEffect(() => {
    if (!loading && pdfDocRef.current) {
      renderPages(currentPage)
    }
  }, [scale, rotation, readerMode, currentPage, loading, renderPages])

  const goToPage = useCallback((page: number) => {
    const target = clamp(page, 1, totalPages)
    setCurrentPage(target)
    if (currentBookId) {
      updateProgress(currentBookId, target, totalPages)
    }
  }, [totalPages, currentBookId, updateProgress])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) goToPage(currentPage + 1)
  }, [currentPage, totalPages, goToPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function cycleTheme() {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const idx = modes.indexOf(theme)
    setTheme(modes[(idx + 1) % modes.length])
  }

  function handleAddBookmark() {
    if (currentBookId) addBookmark(currentBookId, currentPage)
  }

  function handleScroll() {
    if (!controlsVisible) setControlsVisible(true)
    if (controlsTimeoutRef.current !== null) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false)
    }, 3000)
  }

  useKeyboardShortcuts([
    { key: 'ArrowRight', handler: nextPage },
    { key: 'ArrowLeft', handler: prevPage },
    { key: ' ', handler: () => readerMode === 'single' && nextPage() },
    { key: 'f', handler: toggleFullscreen },
    { key: 'b', ctrl: true, handler: handleAddBookmark },
    { key: 'm', handler: () => setReaderMode(readerMode === 'single' ? 'continuous' : 'single') },
    { key: '+', ctrl: true, handler: () => setScale(clamp(scale + 0.25, 0.5, 3)) },
    { key: '-', ctrl: true, handler: () => setScale(clamp(scale - 0.25, 0.5, 3)) },
    { key: '0', ctrl: true, handler: () => setScale(1) },
    { key: 'Escape', handler: () => { if (isFullscreen) document.exitFullscreen() } },
    { key: 'g', ctrl: true, handler: () => { setShowPageDialog(true); setPageInput('') } },
  ])

  if (!currentBook) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No book selected</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">{error}</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            This PDF is not available offline. Please connect to the internet to load it, or save it for offline reading from the library.
          </p>
          <Button onClick={closeBook} className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header
        className={cn(
          'flex items-center gap-2 px-2 sm:px-4 h-12 sm:h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-opacity duration-300 shrink-0 overflow-x-auto',
          !controlsVisible && 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={closeBook}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to library</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px] hidden sm:block">
            {currentBook.title}
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                data-active={showSidebar}
                className="data-[active=true]:bg-accent"
              >
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bookmarks (Ctrl+B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReaderMode(readerMode === 'single' ? 'continuous' : 'single')}
              >
                {readerMode === 'single' ? <AlignJustify className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle mode (M)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScale(clamp(scale - 0.25, 0.5, 3))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <span className="text-xs font-medium text-muted-foreground min-w-[2.5rem] sm:min-w-[3rem] text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScale(clamp(scale + 0.25, 0.5, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 hidden sm:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="hidden sm:inline-flex"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 hidden sm:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={cycleTheme} className="hidden sm:inline-flex">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme ({theme})</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hidden sm:inline-flex">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fullscreen (F)</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" onMouseMove={handleScroll} onScroll={handleScroll}>
        <div
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin',
            readerMode === 'single' && 'flex items-start justify-center py-8',
            readerMode === 'continuous' && 'py-8',
          )}
          style={{ filter: `brightness(${brightness}%)` } as React.CSSProperties}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          ) : (
            <div ref={canvasContainerRef} className="px-2 sm:px-4 max-w-4xl mx-auto" />
          )}
        </div>

        {showSidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <aside className={cn(
              'fixed md:relative inset-y-0 right-0 z-50 w-80 md:w-72',
              'border-l border-border bg-card md:bg-card/50 md:backdrop-blur-sm',
              'animate-in slide-in-from-right duration-300 shrink-0 overflow-y-auto',
              'shadow-2xl md:shadow-none',
            )}>
              <Bookmarks />
            </aside>
          </>
        )}
      </div>

      <footer
        className={cn(
          'flex items-center justify-between px-2 sm:px-4 h-10 sm:h-12 bg-background/80 backdrop-blur-xl border-t border-border/50 transition-opacity duration-300 shrink-0',
          !controlsVisible && 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={prevPage} disabled={currentPage <= 1} className="h-8 w-8 sm:h-9 sm:w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm font-medium gap-1 h-8 sm:h-9"
            onClick={() => { setShowPageDialog(true); setPageInput('') }}
          >
            <span className="tabular-nums">{currentPage}</span>
            <span className="text-muted-foreground hidden sm:inline">/ {totalPages}</span>
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={nextPage} disabled={currentPage >= totalPages} className="h-8 w-8 sm:h-9 sm:w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[120px] sm:max-w-xs mx-2 sm:mx-4">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground tabular-nums min-w-[2rem] sm:min-w-[3rem] text-right">
            {progressPercent}%
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAddBookmark} className="h-8 w-8 sm:h-9 sm:w-9">
                <Bookmark className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add bookmark</TooltipContent>
          </Tooltip>
          {bookmarks.length > 0 && (
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">{bookmarks.length}</span>
          )}
        </div>
      </footer>

      <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Go to page</DialogTitle>
            <DialogDescription>
              Enter a page number between 1 and {totalPages}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt(pageInput)
                if (page >= 1 && page <= totalPages) {
                  goToPage(page)
                  setShowPageDialog(false)
                }
              }
            }}
            placeholder={`1 - ${totalPages}`}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const page = parseInt(pageInput)
                if (page >= 1 && page <= totalPages) {
                  goToPage(page)
                  setShowPageDialog(false)
                }
              }}
            >
              Go
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
