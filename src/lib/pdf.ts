import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export interface PDFMeta {
  title: string
  author: string
  totalPages: number
}

export async function loadPDFDocument(filePath: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(filePath)
  return loadingTask.promise
}

export async function getPDFMeta(filePath: string): Promise<PDFMeta> {
  const doc = await loadPDFDocument(filePath)
  const meta = await doc.getMetadata()
  const info = meta.info as Record<string, unknown>

  return {
    title: (info?.Title as string) || filePath.split('/').pop()?.split('\\').pop()?.replace(/\.pdf$/i, '') || 'Untitled',
    author: (info?.Author as string) || 'Unknown Author',
    totalPages: doc.numPages,
  }
}

export async function renderPageToCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotation: number = 0,
): Promise<void> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale, rotation })

  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise
}

export async function generateThumbnail(
  filePath: string,
  maxWidth: number = 200,
): Promise<string | null> {
  try {
    const doc = await loadPDFDocument(filePath)
    const page = await doc.getPage(1)
    const originalViewport = page.getViewport({ scale: 1 })
    const scale = maxWidth / originalViewport.width
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.toDataURL('image/webp', 0.6)
  } catch {
    return null
  }
}
