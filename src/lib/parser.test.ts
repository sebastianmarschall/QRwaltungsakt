import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { parsePayment, reconstructLines, type TextItem } from './parser'
import fixture from './__fixtures__/za-sample.json'
import estFixture from './__fixtures__/est-sample.json'

// Anonymized text items extracted from a real Finanzamt Zahlungsanweisung
// (ZA202604) via pdf.js. Personal data replaced, structure untouched.
const items = fixture as TextItem[]
// Same for an Einkommensteuer-Vorauszahlung "Benachrichtigung" letter: no tax
// table, no OCR line – the data sits in prose and the electronic-payment hint.
const estItems = estFixture as TextItem[]

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

describe('parsePayment (Einkommensteuer Benachrichtigung)', () => {
  const result = parsePayment(reconstructLines(estItems))

  it('finds IBAN and BIC from the "Unsere Bankverbindung" block', () => {
    expect(result.recipientIban).toBe('AT360100000005504082')
    expect(result.bic).toBe('BUNDATWW')
  })

  it('uses the sender as recipient name (letters name no Dienststelle)', () => {
    expect(result.recipientName).toBe('Finanzamt Österreich')
  })

  it('reads the "Steuernummer:" label', () => {
    expect(result.taxNumber).toBe('12 345/6789')
  })

  it('extracts the tax item from the electronic-payment hint', () => {
    // "… die Abgabenart E, den Zeitraum 07092026 und den Betrag € 3.700,00 …"
    expect(result.taxItems).toEqual([{ code: 'E', period: '07-092026', amountCents: 370000 }])
    expect(result.amountCents).toBe(370000)
  })

  it('encodes the quarter as YYMM/MM in the structured remittance', () => {
    expect(result.remittanceSuggestion).toBe('123456789 2607/09+370000E')
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

    const quarter = parsePayment(['StNr: 12 345/6789', 'E 01-032026 300,00'])
    expect(quarter.taxItems).toEqual([{ code: 'E', period: '01-032026', amountCents: 30000 }])
    // month ranges are structured-capable: YYMM/MM per the PSA/STUZZA grammar
    expect(quarter.remittanceSuggestion).toBe('123456789 2601/03+30000E')
  })

  it('rejects hint periods with impossible month ranges', () => {
    const hint = (zeitraum: string) =>
      parsePayment([
        `bitte die Steuernummer 123456789 sowie die Abgabenart E, den Zeitraum ${zeitraum} und den Betrag`,
        '€ 3.700,00 an, oder verwenden Sie die eps-Überweisung.',
      ]).taxItems
    expect(hint('13152026')).toEqual([])
    expect(hint('09072026')).toEqual([]) // backwards range
    expect(hint('07092026')).toEqual([{ code: 'E', period: '07-092026', amountCents: 370000 }])
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

// Same for the Einkommensteuer Benachrichtigung (create via
// node scripts/extract-fixture.mjs <pdf> /tmp/est-items.json).
describe.runIf(existsSync('/tmp/est-items.json'))(
  'parsePayment (real Einkommensteuer PDF, local only)',
  () => {
    it('parses the real Benachrichtigung extraction', () => {
      const realItems = JSON.parse(readFileSync('/tmp/est-items.json', 'utf8')) as TextItem[]
      const result = parsePayment(reconstructLines(realItems))
      expect(result.recipientIban).toBe('AT360100000005504082')
      expect(result.bic).toBe('BUNDATWW')
      expect(result.recipientName).toBe('Finanzamt Österreich')
      expect(result.amountCents).toBe(370000)
      expect(result.taxNumber).toMatch(/^\d{2} \d{3}\/\d{4}$/)
      expect(result.remittanceSuggestion).toMatch(/^\d{9} 2607\/09\+370000E$/)
      expect(result.warnings).toEqual([])
    })
  },
)
