import { isValidIban, normalizeIban } from './iban'
import { centsToEpcAmount } from './amount'

/**
 * EPC069-12 "EPC QR code" (GiroCode) payload builder.
 * Spec: 12 LF-separated lines, version 002, UTF-8, error correction M.
 */
export interface EpcInput {
  name: string
  iban: string
  bic?: string
  amountCents?: number
  /** 4-letter SEPA purpose code, e.g. TAXS for tax payments. */
  purpose?: string
  /** Unstructured remittance info (Verwendungszweck), max 140 chars. */
  remittance?: string
}

export type EpcField = 'name' | 'iban' | 'bic' | 'amount' | 'remittance'
export type EpcErrors = Partial<Record<EpcField, string>>

export const MAX_NAME = 70
export const MAX_REMITTANCE = 140
export const MIN_CENTS = 1
export const MAX_CENTS = 99999999999 // 999,999,999.99 EUR

export function validateEpc(input: EpcInput): EpcErrors {
  const errors: EpcErrors = {}
  if (!input.name.trim()) errors.name = 'required'
  else if (input.name.trim().length > MAX_NAME) errors.name = 'tooLong'

  if (!input.iban.trim()) errors.iban = 'required'
  else if (!isValidIban(input.iban)) errors.iban = 'invalid'

  if (input.bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(input.bic.trim().toUpperCase())) {
    errors.bic = 'invalid'
  }

  if (input.amountCents === undefined) errors.amount = 'required'
  else if (input.amountCents < MIN_CENTS || input.amountCents > MAX_CENTS) {
    errors.amount = 'outOfRange'
  }

  if ((input.remittance ?? '').length > MAX_REMITTANCE) errors.remittance = 'tooLong'

  return errors
}

/**
 * Builds the QR payload. Call validateEpc first; this throws on invalid input
 * rather than emitting a payload a bank might misread.
 */
export function buildEpcPayload(input: EpcInput): string {
  const errors = validateEpc(input)
  if (Object.keys(errors).length > 0) {
    throw new Error(`invalid EPC input: ${Object.keys(errors).join(', ')}`)
  }

  const lines = [
    'BCD',
    '002',
    '1', // UTF-8
    'SCT',
    input.bic?.trim().toUpperCase() ?? '',
    input.name.trim(),
    normalizeIban(input.iban),
    `EUR${centsToEpcAmount(input.amountCents!)}`,
    input.purpose?.trim().toUpperCase() ?? '',
    '', // structured reference (unused – Finanzamt allocation goes in the line below)
    (input.remittance ?? '').trim(),
    '', // beneficiary-to-originator information (unused)
  ]

  // Trailing empty lines may be omitted (lines 1–7 are always present).
  while (lines.length > 7 && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}
