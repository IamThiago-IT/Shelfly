import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
}

export interface PDFMeta {
  title: string
  author: string
  totalPages: number
}

export async function loadPDFDocument(filePath: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({
    url: filePath,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  })
  return loadingTask.promise
}

export async function loadPDFDocumentFromBuffer(data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data })
  return loadingTask.promise
}

export async function getPDFMeta(filePath: string): Promise<PDFMeta> {
  const doc = await loadPDFDocument(filePath)
  try {
    const meta = await doc.getMetadata()
    const info = meta.info as Record<string, unknown>

    return {
      title: (info?.Title as string) || filePath.split('/').pop()?.split('\\').pop()?.replace(/\.pdf$/i, '') || 'Untitled',
      author: (info?.Author as string) || 'Unknown Author',
      totalPages: doc.numPages,
    }
  } finally {
    try {
      await doc.destroy()
    } catch {
      // ignore destroy errors (already destroyed / worker terminated)
    }
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
  let doc: pdfjsLib.PDFDocumentProxy | null = null
  try {
    doc = await loadPDFDocument(filePath)
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
    // cleanup page resources promptly
    try {
      page.cleanup()
    } catch {
      // ignore
    }
    try {
      return canvas.toDataURL('image/webp', 0.6)
    } catch {
      // WebP not supported -> fallback jpeg
      return canvas.toDataURL('image/jpeg', 0.7)
    }
  } catch {
    return null
  } finally {
    if (doc) {
      try {
        await doc.destroy()
      } catch {
        // ignore destroy errors
      }
    }
  }
}
