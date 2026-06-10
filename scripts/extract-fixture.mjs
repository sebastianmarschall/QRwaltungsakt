// Extracts pdf.js text items from a Finanzamt PDF for parser development.
// Usage: node scripts/extract-fixture.mjs <path-to.pdf> [out.json]
// Writes /tmp/items.json by default; the vitest suite picks it up as a
// local-only ground-truth test. Never commit real extractions – they contain
// personal data (use the anonymized fixture in src/lib/__fixtures__).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

const [pdfPath, outPath = '/tmp/items.json'] = process.argv.slice(2)
if (!pdfPath) {
  console.error('usage: node scripts/extract-fixture.mjs <path-to.pdf> [out.json]')
  process.exit(1)
}

const data = new Uint8Array(readFileSync(pdfPath))
const doc = await getDocument({ data, verbosity: 0 }).promise
const items = []
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const content = await page.getTextContent()
  for (const it of content.items) {
    if (it.str !== undefined) {
      items.push({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) - p * 100_000 })
    }
  }
}
writeFileSync(outPath, JSON.stringify(items, null, 1) + '\n')
console.log(`${items.length} text items → ${outPath}`)
