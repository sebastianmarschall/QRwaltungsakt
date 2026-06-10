import { describe, expect, it } from 'vitest'
import { formatIban, isFinanzamtIban, isValidIban, normalizeIban } from './iban'

describe('isValidIban', () => {
  it('accepts valid IBANs in any spacing', () => {
    expect(isValidIban('AT36 0100 0000 0550 4082')).toBe(true)
    expect(isValidIban('AT360100000005504082')).toBe(true)
    expect(isValidIban('at36 0100 0000 0550 4082')).toBe(true)
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true)
  })

  it('rejects checksum and format errors', () => {
    expect(isValidIban('AT37 0100 0000 0550 4082')).toBe(false) // wrong check digits
    expect(isValidIban('AT36 0100 0000 0550 408')).toBe(false) // too short
    expect(isValidIban('')).toBe(false)
    expect(isValidIban('not an iban')).toBe(false)
  })
})

describe('formatIban / normalizeIban', () => {
  it('round-trips', () => {
    expect(formatIban('AT360100000005504082')).toBe('AT36 0100 0000 0550 4082')
    expect(normalizeIban('AT36 0100 0000 0550 4082')).toBe('AT360100000005504082')
  })
})

describe('isFinanzamtIban', () => {
  it('recognizes BAWAG P.S.K. BLZ 01000 accounts', () => {
    expect(isFinanzamtIban('AT36 0100 0000 0550 4082')).toBe(true)
    expect(isFinanzamtIban('AT79 2011 1000 1234 5678')).toBe(false)
  })
})
