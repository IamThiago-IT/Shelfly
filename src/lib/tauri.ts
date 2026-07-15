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

  await fsApi.copyFile(sourcePath, destPath)
  return destPath
}

export async function readFileAsDataUrl(filePath: string): Promise<string> {
  if (!isTauri() || !fsApi) {
    return filePath
  }
  const bytes = await fsApi.readFile(filePath)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

export async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  if (!isTauri() || !fsApi) {
    const response = await fetch(filePath)
    return response.arrayBuffer()
  }
  const bytes = await fsApi.readFile(filePath)
  return bytes.buffer
}

export async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!tauriApi) throw new Error('Tauri API not initialized')
  return tauriApi.invoke<T>(cmd, args)
}

export async function exportBackup(): Promise<string> {
  if (!isTauri()) {
    const data = localStorage.getItem('shelfly-storage')
    return data || '{}'
  }
  return invokeTauri<string>('export_backup')
}

export async function importBackup(json: string): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem('shelfly-storage', json)
    return
  }
  await invokeTauri('import_backup', { data: json })
}
