import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { TextItem } from './parser'

export async function extractTextItems(file: File): Promise<TextItem[]> {
  // pdf.js is ~650 kB – load it lazily on first use, not on page load.
  // Worker and library are bundled with the app: no CDN, works offline,
  // satisfied by the strict CSP.
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = workerUrl

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data, verbosity: 0 })
  const doc = await loadingTask.promise
  try {
    const items: TextItem[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      for (const item of content.items) {
        if ('str' in item) {
          items.push({
            str: item.str,
            x: item.transform[4],
            // keep pages from interleaving when lines are grouped by y
            y: item.transform[5] - p * 100_000,
          })
        }
      }
    }
    return items
  } finally {
    await loadingTask.destroy()
  }
}
