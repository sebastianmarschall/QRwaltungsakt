import { describe, expect, it } from 'vitest'
import {
  FINANZAMT_ACCOUNTS,
  findFinanzamtAccount,
  officeFromRemittance,
} from './finanzamtAccounts'
import { isFinanzamtIban, isValidIban } from './iban'

describe('official BMF account directory', () => {
  it('contains the full directory with structurally valid IBANs', () => {
    expect(FINANZAMT_ACCOUNTS.length).toBeGreaterThanOrEqual(35)
    for (const account of FINANZAMT_ACCOUNTS) {
      expect(isValidIban(account.iban), `${account.name}: ${account.iban}`).toBe(true)
      expect(isFinanzamtIban(account.iban), `${account.name}: ${account.iban}`).toBe(true)
      expect(account.office).toMatch(/^\d{2}$/)
    }
  })

  it('verifies a known Finanzamt IBAN offline (payee verification)', () => {
    const account = findFinanzamtAccount('AT36 0100 0000 0550 4082')
    expect(account?.office).toBe('08')
    expect(account?.name).toBe('Dienststelle Wien 12/13/14 Purkersdorf')
  })

  it('returns undefined for IBANs not in the directory', () => {
    expect(findFinanzamtAccount('AT79 2011 1000 1234 5678')).toBeUndefined()
    expect(findFinanzamtAccount('')).toBeUndefined()
  })
})

describe('officeFromRemittance', () => {
  it('extracts the Dienststellen number from both remittance formats', () => {
    expect(officeFromRemittance('123456789 2604+136500U')).toBe('12')
    expect(officeFromRemittance('StNr. 08 345/6789 / U 04/2026')).toBe('08')
    expect(officeFromRemittance('StNr: 11-999/9118')).toBe('11')
  })

  it('does not misread tax segments as office numbers', () => {
    expect(officeFromRemittance('2604+136500U')).toBeUndefined()
    expect(officeFromRemittance('')).toBeUndefined()
  })
})
