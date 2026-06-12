import { Library, BookOpen, History, Bookmark, Settings, ChevronLeft, Search } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip'

const navItems = [
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'recent' as const, label: 'Recent', icon: History },
  { id: 'bookmarks' as const, label: 'Bookmarks', icon: Bookmark },
]

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const books = useAppStore((s) => s.books)
  const getRecentBooks = useAppStore((s) => s.getRecentBooks)
  const bookmarks = useAppStore((s) => s.bookmarks)

  const recentCount = getRecentBooks().length

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col',
          'bg-sidebar border-r border-sidebar-border',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0',
        )}
      >
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-sidebar-border shrink-0',
          !sidebarOpen && 'lg:justify-center lg:px-0',
        )}>
          <div className={cn('flex items-center gap-3 flex-1', !sidebarOpen && 'lg:hidden')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground">Shelfly</h1>
              <p className="text-[10px] text-sidebar-muted-foreground">PDF Reader</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn('hidden lg:flex shrink-0', !sidebarOpen && 'lg:flex')}
              >
                <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarOpen ? 'Collapse' : 'Expand'}</TooltipContent>
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const count = item.id === 'library' ? books.length : item.id === 'recent' ? recentCount : bookmarks.length
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentView === item.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView(item.id as 'library')}
                      className={cn(
                        'w-full justify-start gap-3 h-10 px-3',
                        !sidebarOpen && 'lg:justify-center lg:px-0 lg:w-10 lg:h-10',
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className={cn('truncate', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
                      {count > 0 && (
                        <span className={cn(
                          'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          currentView === item.id
                            ? 'bg-primary/10 text-primary'
                            : 'bg-sidebar-muted text-sidebar-muted-foreground',
                          !sidebarOpen && 'lg:hidden',
                        )}>
                          {count}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={cn(sidebarOpen && 'lg:hidden')}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          <Separator className="my-4" />

          <div className="space-y-1">
            <p className={cn(
              'px-3 py-1 text-[10px] font-medium text-sidebar-muted-foreground uppercase tracking-wider',
              !sidebarOpen && 'lg:hidden',
            )}>
              Quick Actions
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-3 h-10 px-3',
                    !sidebarOpen && 'lg:justify-center lg:px-0 lg:w-10 lg:h-10',
                  )}
                  onClick={() => {
                    const event = new CustomEvent('open-command-palette')
                    window.dispatchEvent(event)
                  }}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className={cn(!sidebarOpen && 'lg:hidden')}>Search...</span>
                  <kbd className={cn(
                    'ml-auto text-[10px] px-1.5 py-0.5 rounded border bg-sidebar-muted text-sidebar-muted-foreground',
                    !sidebarOpen && 'lg:hidden',
                  )}>
                    Ctrl+K
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(sidebarOpen && 'lg:hidden')}>
                Search (Ctrl+K)
              </TooltipContent>
            </Tooltip>
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-sidebar-border shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start gap-3 h-10 px-3 text-sidebar-muted-foreground',
                  !sidebarOpen && 'lg:justify-center lg:px-0 lg:w-10 lg:h-10',
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className={cn(!sidebarOpen && 'lg:hidden')}>Settings</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className={cn(sidebarOpen && 'lg:hidden')}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </>
  )
}
