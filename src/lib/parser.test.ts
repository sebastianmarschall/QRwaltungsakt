import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { parsePayment, reconstructLines, type TextItem } from './parser'
import fixture from './__fixtures__/za-sample.json'

// Anonymized text items extracted from a real Finanzamt Zahlungsanweisung
// (ZA202604) via pdf.js. Personal data replaced, structure untouched.
const items = fixture as TextItem[]

describe('reconstructLines', () => {
  it('restores reading order from fragmented glyphs', () => {
    const lines = reconstructLines(items)
    // amount printed right-to-left as single glyphs in the text layer
    expect(lines.some((l) => l.includes('1365,00'))).toBe(true)
    // OCR control line
    expect(lines.some((l) => l.includes('00000136500<'))).toBe(true)
  })
})

describe('parsePayment', () => {
  const result = parsePayment(reconstructLines(items))

  it('finds the Finanzamt IBAN, not the taxpayer’s own', () => {
    expect(result.recipientIban).toBe('AT360100000005504082')
    expect(result.bic).toBe('BUNDATWWXXX')
  })

  it('finds the recipient name without column duplication', () => {
    expect(result.recipientName).toBe('DIENSTSTELLE WIEN 12/13/14 PURKERSDORF')
  })

  it('finds amount, tax number and tax items', () => {
    expect(result.amountCents).toBe(136500)
    expect(result.taxNumber).toBe('12 345/6789')
    expect(result.taxItems).toEqual([{ code: 'U', period: '042026', amountCents: 136500 }])
  })

  it('suggests the machine-readable Finanzamtszahlung remittance', () => {
    // tax number, then YYMM+cents+code per position – the grammar banking
    // apps (George) parse back into labelled positions
    expect(result.remittanceSuggestion).toBe('123456789 2604+136500U')
  })

  it('falls back to a human-readable remittance when the amount is missing', () => {
    const result = parsePayment(['StNr: 12 345/6789', 'U 042026', 'AT360100000005504082'])
    expect(result.remittanceSuggestion).toBe('StNr. 12 345/6789 / U 04/2026')
  })

  it('parses without warnings', () => {
    expect(result.warnings).toEqual([])
  })
})

describe('parsePayment degradation', () => {
  it('warns instead of throwing on unrelated text', () => {
    const result = parsePayment(['Hello', 'World'])
    expect(result.recipientIban).toBeUndefined()
    expect(result.warnings).toContain('noIban')
    expect(result.warnings).toContain('noAmount')
    expect(result.warnings).toContain('noTaxNumber')
  })

  it('parses year-only and quarter-range periods (official period formats)', () => {
    // EZ (Aussetzungszinsen) uses JJJJ, E (Einkommensteuer) is quarterly
    const yearOnly = parsePayment(['StNr: 12 345/6789', 'EZ 2026 50,00'])
    expect(yearOnly.taxItems).toEqual([{ code: 'EZ', period: '2026', amountCents: 5000 }])
    // no YYMM grammar possible for a year-only period → human-readable fallback
    expect(yearOnly.remittanceSuggestion).toBe('StNr. 12 345/6789 / EZ 2026')

    const quarter = parsePayment(['E 01-032026 300,00'])
    expect(quarter.taxItems).toEqual([{ code: 'E', period: '01-032026', amountCents: 30000 }])
  })

  it('rejects six-digit "periods" with impossible months', () => {
    expect(parsePayment(['U 136500 99,00']).taxItems).toEqual([])
  })

  it('falls back to the Finanzamt BLZ pattern when no BIC is printed', () => {
    const result = parsePayment(['AT360100000005504082', 'AT792011100012345678'])
    expect(result.recipientIban).toBe('AT360100000005504082')
  })
})

// Ground-truth check against the real, non-anonymized PDF extraction.
// Only runs locally when /tmp/items.json exists (created by scripts/extract-fixture.mjs).
describe.runIf(existsSync('/tmp/items.json'))('parsePayment (real PDF, local only)', () => {
  it('parses the real ZA202604.pdf extraction', () => {
    const realItems = JSON.parse(readFileSync('/tmp/items.json', 'utf8')) as TextItem[]
    const result = parsePayment(reconstructLines(realItems))
    expect(result.recipientIban).toBe('AT360100000005504082')
    expect(result.bic).toBe('BUNDATWWXXX')
    expect(result.recipientName).toBe('DIENSTSTELLE WIEN 12/13/14 PURKERSDORF')
    expect(result.amountCents).toBe(136500)
    // pattern-matched so the real tax number never lands in the repo
    expect(result.taxNumber).toMatch(/^\d{2} \d{3}\/\d{4}$/)
    expect(result.remittanceSuggestion).toMatch(/^\d{9} 2604\+136500U$/)
    expect(result.warnings).toEqual([])
  })
})
