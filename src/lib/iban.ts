export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}

/** Groups of four, the way IBANs are printed: AT36 0100 0000 0550 4082 */
export function formatIban(input: string): string {
  return normalizeIban(input).replace(/(.{4})/g, '$1 ').trim()
}

/** ISO 13616 mod-97 check. */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const value = ch >= 'A' ? ch.charCodeAt(0) - 55 : ch.charCodeAt(0) - 48
    remainder = value >= 10 ? (remainder * 100 + value) % 97 : (remainder * 10 + value) % 97
  }
  return remainder === 1
}

/**
 * Austrian Finanzamt accounts are held at BAWAG P.S.K. (Bankleitzahl 01000,
 * BIC BUNDATWWXXX). Used as a tie-breaker when a payment slip contains both
 * the recipient's and the taxpayer's own IBAN.
 */
export function isFinanzamtIban(input: string): boolean {
  const iban = normalizeIban(input)
  return iban.startsWith('AT') && iban.slice(4, 9) === '01000'
}
