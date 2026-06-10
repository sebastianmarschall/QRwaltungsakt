import { describe, expect, it } from 'vitest'
import { buildEpcPayload, validateEpc, type EpcInput } from './epc'

const sample: EpcInput = {
  name: 'DIENSTSTELLE WIEN 12/13/14 PURKERSDORF',
  iban: 'AT36 0100 0000 0550 4082',
  bic: 'BUNDATWWXXX',
  amountCents: 136500,
  purpose: 'TAXS',
  remittance: '123456789 2604+136500U',
}

describe('buildEpcPayload', () => {
  it('produces the golden payload for the sample Zahlschein', () => {
    expect(buildEpcPayload(sample)).toBe(
      [
        'BCD',
        '002',
        '1',
        'SCT',
        'BUNDATWWXXX',
        'DIENSTSTELLE WIEN 12/13/14 PURKERSDORF',
        'AT360100000005504082',
        'EUR1365.00',
        'TAXS',
        '',
        '123456789 2604+136500U',
      ].join('\n'),
    )
  })

  it('omits trailing empty lines but keeps the mandatory block', () => {
    const minimal = buildEpcPayload({
      name: 'X',
      iban: 'AT36 0100 0000 0550 4082',
      amountCents: 100,
    })
    expect(minimal).toBe('BCD\n002\n1\nSCT\n\nX\nAT360100000005504082\nEUR1.00')
  })

  it('formats cents as dot-decimal euro amounts', () => {
    const payload = buildEpcPayload({ ...sample, amountCents: 5 })
    expect(payload).toContain('EUR0.05')
  })

  it('keeps umlauts (UTF-8, charset indicator 1)', () => {
    const payload = buildEpcPayload({ ...sample, remittance: 'Körperschaftsteuer' })
    expect(payload.split('\n')[2]).toBe('1')
    expect(payload).toContain('Körperschaftsteuer')
  })

  it('throws on invalid input instead of emitting a broken payload', () => {
    expect(() => buildEpcPayload({ ...sample, iban: 'AT00 1234' })).toThrow(/iban/)
  })
})

describe('validateEpc', () => {
  it('accepts the sample', () => {
    expect(validateEpc(sample)).toEqual({})
  })

  it('rejects bad IBAN checksums', () => {
    expect(validateEpc({ ...sample, iban: 'AT37 0100 0000 0550 4082' })).toHaveProperty(
      'iban',
      'invalid',
    )
  })

  it('rejects names over 70 chars and remittance over 140 chars', () => {
    expect(validateEpc({ ...sample, name: 'X'.repeat(71) })).toHaveProperty('name', 'tooLong')
    expect(validateEpc({ ...sample, remittance: 'X'.repeat(141) })).toHaveProperty(
      'remittance',
      'tooLong',
    )
  })

  it('rejects missing or out-of-range amounts', () => {
    expect(validateEpc({ ...sample, amountCents: undefined })).toHaveProperty('amount', 'required')
    expect(validateEpc({ ...sample, amountCents: 0 })).toHaveProperty('amount', 'outOfRange')
    expect(validateEpc({ ...sample, amountCents: 100000000000 })).toHaveProperty(
      'amount',
      'outOfRange',
    )
  })

  it('rejects malformed BICs but allows omitting the BIC (version 002)', () => {
    expect(validateEpc({ ...sample, bic: 'NOPE' })).toHaveProperty('bic', 'invalid')
    expect(validateEpc({ ...sample, bic: undefined })).toEqual({})
  })
})
