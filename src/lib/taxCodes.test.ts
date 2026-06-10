import { describe, expect, it } from 'vitest'
import { TAX_CODES, formatTaxPeriod, isKnownTaxCode, taxCodeLabel } from './taxCodes'

describe('official BMF registry', () => {
  it('contains the full Verzeichnis der Abgabenarten', () => {
    expect(Object.keys(TAX_CODES).length).toBeGreaterThan(180)
    expect(taxCodeLabel('U')).toBe('Umsatzsteuer')
    expect(taxCodeLabel('E')).toBe('Einkommensteuer')
    expect(taxCodeLabel('EG')).toBe('Pfändungsgebühr')
    expect(taxCodeLabel('DIS')).toBe('Digitalsteuer')
    expect(taxCodeLabel('XX')).toBe('XX') // unknown → code itself
  })

  it('knows period formats per code', () => {
    expect(TAX_CODES['U'].period).toBe('MM/JJJJ')
    expect(TAX_CODES['E'].period).toBe('KVJ')
    expect(TAX_CODES['EZ'].period).toBe('JJJJ')
  })

  it('rejects codes that are not in the registry', () => {
    expect(isKnownTaxCode('NOVA')).toBe(false) // not an official payment code
    expect(isKnownTaxCode('u')).toBe(true)
  })
})

describe('formatTaxPeriod', () => {
  it('formats slip periods human-readably', () => {
    expect(formatTaxPeriod('042026')).toBe('04/2026')
    expect(formatTaxPeriod('01-032026')).toBe('01-03/2026')
    expect(formatTaxPeriod('01-03/2026')).toBe('01-03/2026')
    expect(formatTaxPeriod('2026')).toBe('2026')
  })
})
