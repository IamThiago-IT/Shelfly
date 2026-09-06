let tauriApi: typeof import('@tauri-apps/api/core') | null = null
let dialogApi: typeof import('@tauri-apps/plugin-dialog') | null = null
let fsApi: typeof import('@tauri-apps/plugin-fs') | null = null

export async function initTauri() {
  try {
    tauriApi = await import('@tauri-apps/api/core')
    dialogApi = await import('@tauri-apps/plugin-dialog')
    fsApi = await import('@tauri-apps/plugin-fs')
    return true
  } catch {
    return false
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function pickPDFFiles(): Promise<string[]> {
  if (!isTauri() || !dialogApi) return []
  const selected = await dialogApi.open({
    multiple: true,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  if (!selected) return []
  const paths = Array.isArray(selected) ? selected : [selected]
  return paths
}

export async function copyFileToAppDir(sourcePath: string): Promise<string> {
  if (!isTauri() || !fsApi || !tauriApi) throw new Error('Not in Tauri environment')

  const appDir = await tauriApi.invoke<string>('get_app_data_dir')
  const fileName = sourcePath.split('\\').pop()?.split('/').pop() || `document-${Date.now()}.pdf`
  const destPath = `${appDir}/books/${fileName}`

  try {
    await fsApi.mkdir(`${appDir}/books`, { recursive: true })
  } catch {
    // ignore if exists
  }

  await fsApi.copyFile(sourcePath, destPath)
  return destPath
}

let _revokeMap = new Map<string, string>()
export function trackObjectUrl(key: string, url: string) {
  const prev = _revokeMap.get(key)
  if (prev) URL.revokeObjectURL(prev)
  _revokeMap.set(key, url)
  return url
}
export function revokeObjectUrl(key: string) {
  const url = _revokeMap.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    _revokeMap.delete(key)
  }
}
export function revokeAllObjectUrls() {
  for (const url of _revokeMap.values()) URL.revokeObjectURL(url)
  _revokeMap.clear()
}

export async function readFileAsDataUrl(filePath: string): Promise<string> {
  if (!isTauri() || !fsApi) {
    return filePath
  }
  const bytes = await fsApi.readFile(filePath)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  trackObjectUrl(filePath, url)
  return url
}

export async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  if (!isTauri() || !fsApi) {
    if (filePath.startsWith('blob:')) {
      const response = await fetch(filePath)
      return response.arrayBuffer()
    }
    const response = await fetch(filePath)
    if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.status}`)
    return response.arrayBuffer()
  }
  const bytes = await fsApi.readFile(filePath)
  // bytes is Uint8Array; ensure ArrayBuffer slice copy
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!tauriApi) throw new Error('Tauri API not initialized')
  return tauriApi.invoke<T>(cmd, args)
}

export async function exportBackup(): Promise<string> {
  if (!isTauri()) {
    const raw = localStorage.getItem('shelfly-storage')
    if (!raw) return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), books: [], bookmarks: [], readingSessions: {} })
    try {
      const parsed = JSON.parse(raw)
      // zustand persist stores { state: {...}, version: ... }
      const state = parsed.state ?? parsed
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        books: state.books ?? [],
        bookmarks: state.bookmarks ?? [],
        readingSessions: state.readingSessions ?? {},
      }, null, 2)
    } catch {
      return raw
    }
  }
  return invokeTauri<string>('export_backup')
}

export async function importBackup(json: string): Promise<void> {
  if (!isTauri()) {
    // validate JSON before storing
    const data = JSON.parse(json)
    const books = data.books ?? data.state?.books
    if (books && !Array.isArray(books)) throw new Error('Invalid backup format')
    // store as zustand persist format if needed
    if (data.state) {
      localStorage.setItem('shelfly-storage', json)
    } else {
      // wrap into zustand persist envelope
      const envelope = { state: data, version: data.version ?? 1 }
      localStorage.setItem('shelfly-storage', JSON.stringify(envelope))
    }
    // trigger reload so store rehydrates
    window.location.reload()
    return
  }
  await invokeTauri('import_backup', { data: json })
}
