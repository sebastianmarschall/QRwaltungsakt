import { isFinanzamtIban, isValidIban } from './iban'
import { isKnownTaxCode, formatTaxPeriod } from './taxCodes'
import { parseAmountToCents } from './amount'

export interface TextItem {
  str: string
  x: number
  y: number
}

export interface TaxItem {
  code: string
  period: string
  amountCents?: number
}

export interface ParsedPayment {
  recipientName?: string
  recipientIban?: string
  bic?: string
  amountCents?: number
  taxNumber?: string
  taxItems: TaxItem[]
  /** Pre-built Verwendungszweck the Finanzamt can allocate: "StNr. … / U 04/2026" */
  remittanceSuggestion?: string
  warnings: ParseWarning[]
}

export type ParseWarning =
  | 'noIban'
  | 'multipleRecipientIbans'
  | 'noAmount'
  | 'amountMismatch'
  | 'noTaxNumber'
  | 'noRecipientName'

/**
 * The Zahlschein text layer is heavily fragmented: IBANs arrive as 4-digit
 * tokens, amounts as single glyphs in right-to-left stream order. Sorting by
 * coordinates restores readable lines (top to bottom, left to right).
 */
export function reconstructLines(items: TextItem[], yTolerance = 2): string[] {
  const rows: { y: number; items: TextItem[] }[] = []
  for (const item of items) {
    if (item.str.trim() === '') continue
    const row = rows.find((r) => Math.abs(r.y - item.y) <= yTolerance)
    if (row) row.items.push(item)
    else rows.push({ y: item.y, items: [item] })
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      const sorted = r.items.sort((a, b) => a.x - b.x).map((i) => i.str.trim())
      // single glyphs ("1","3","6","5",",","0","0") belong to one fragmented
      // token – join them without separator so "1365,00" survives
      let line = ''
      sorted.forEach((str, i) => {
        const prev = sorted[i - 1]
        line += i === 0 || (prev!.length === 1 && str.length === 1) ? str : ` ${str}`
      })
      return line.replace(/\s+/g, ' ').trim()
    })
}

// AT IBANs are exactly AT + 2 check digits + 16 digits; matched on squashed text.
const IBAN_SQUASHED_RE = /AT\d{18}(?!\d)/g
// BIC with Austrian country code; lookarounds instead of \b so it matches in squashed text.
const BIC_SQUASHED_RE = /(?<![A-Z])[A-Z]{4}AT[A-Z0-9]{2}(?:[A-Z0-9]{3})?(?![A-Z])/g
// Official codes are 1-3 letters; periods appear as MMJJJJ ("042026"),
// quarter ranges ("01-032026"), or year only ("2026") depending on the
// Abgabenart. Amounts appear with ("1.365,00") or without ("1365,00")
// thousands separator.
const TAX_LINE_RE =
  /\b([A-Z]{1,3})\s+(\d{2}-\d{2}\/?\d{4}|\d{6}|(?:19|20)\d{2})\b(?:\s+((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}))?/g
const AMOUNT_RE = /(?<![\d,.])((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?![\d,])/g
/** OCR control line at the bottom of the slip, amount in cents: "00000136500<" */
const CONTROL_RE = /(?<!\d[,.])0*(\d{1,12})</

const squash = (s: string) => s.replace(/\s/g, '')

/**
 * Parses reconstructed lines of a Finanzamt "Zahlungsanweisung" into payment
 * data. Never throws – missing fields surface as warnings and the UI lets the
 * user fill the gaps.
 */
export function parsePayment(lines: string[]): ParsedPayment {
  const warnings: ParseWarning[] = []

  const { recipientIban, bic, ibanWarnings } = findRecipientIban(lines)
  warnings.push(...ibanWarnings)

  const recipientName = findRecipientName(lines, recipientIban)
  if (!recipientName) warnings.push('noRecipientName')

  const taxNumber = lines
    .map((l) => /StNr\.?:?\s*(\d{2}\s?\d{3}\/\d{4})/.exec(l)?.[1])
    .find(Boolean)
  if (!taxNumber) warnings.push('noTaxNumber')

  const taxItems = findTaxItems(lines)
  const amountCents = findAmount(lines, taxItems, warnings)

  return {
    recipientName,
    recipientIban,
    bic,
    amountCents,
    taxNumber,
    taxItems,
    remittanceSuggestion: buildRemittance(taxNumber, taxItems),
    warnings,
  }
}

/**
 * Prefers the machine-readable "Finanzamtszahlung" remittance grammar that
 * banks themselves write for tax payments – tax number, then one segment of
 * YYMM+amount-in-cents+tax-code per position (e.g. "083226340 2604+136500U").
 * Banking apps like George parse it back into labelled positions. Falls back
 * to a human-readable form when any piece needed for the grammar is missing.
 */
function buildRemittance(taxNumber: string | undefined, taxItems: TaxItem[]): string | undefined {
  const structured =
    taxNumber &&
    taxItems.length > 0 &&
    taxItems.every((i) => i.amountCents !== undefined && /^\d{2}\d{4}$/.test(i.period))
  if (structured) {
    const stnr = taxNumber.replace(/[\s/]/g, '')
    const segments = taxItems.map((i) => {
      const [, mm, yyyy] = /^(\d{2})(\d{4})$/.exec(i.period)!
      return `${yyyy.slice(2)}${mm}+${i.amountCents}${i.code}`
    })
    return [stnr, ...segments].join(' ')
  }

  const parts: string[] = []
  if (taxNumber) parts.push(`StNr. ${taxNumber}`)
  for (const item of taxItems) {
    parts.push(`${item.code} ${formatTaxPeriod(item.period)}`)
  }
  return parts.length ? parts.join(' / ') : undefined
}

/**
 * The slip contains two IBANs: the Finanzamt's and the taxpayer's own.
 * The recipient IBAN is the one directly followed by a BIC (BUNDATWWXXX)
 * in reading order; Finanzamt accounts (BAWAG P.S.K., BLZ 01000) break ties.
 */
function findRecipientIban(lines: string[]): {
  recipientIban?: string
  bic?: string
  ibanWarnings: ParseWarning[]
} {
  interface Token {
    kind: 'iban' | 'bic'
    value: string
  }
  const tokens: Token[] = []
  for (const line of lines) {
    const squashed = squash(line)
    const found: (Token & { index: number })[] = []
    for (const m of squashed.matchAll(IBAN_SQUASHED_RE)) {
      if (isValidIban(m[0])) found.push({ kind: 'iban', value: m[0], index: m.index })
    }
    for (const m of squashed.matchAll(BIC_SQUASHED_RE)) {
      found.push({ kind: 'bic', value: m[0], index: m.index })
    }
    found.sort((a, b) => a.index - b.index)
    tokens.push(...found)
  }

  if (!tokens.some((t) => t.kind === 'iban')) return { ibanWarnings: ['noIban'] }

  const candidates = new Map<string, string | undefined>() // iban -> bic
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== 'iban') continue
    const next = tokens[i + 1]
    if (next?.kind === 'bic' && !candidates.has(tokens[i].value)) {
      candidates.set(tokens[i].value, next.value)
    }
  }

  // Fallback: no IBAN/BIC pair found – use the characteristic Finanzamt BLZ
  if (candidates.size === 0) {
    for (const token of tokens) {
      if (token.kind === 'iban' && isFinanzamtIban(token.value)) {
        candidates.set(token.value, undefined)
      }
    }
  }
  if (candidates.size === 0) return { ibanWarnings: ['noIban'] }

  const ibans = [...candidates.keys()]
  const finanzamt = ibans.filter(isFinanzamtIban)
  const chosen = finanzamt[0] ?? ibans[0]
  const ibanWarnings: ParseWarning[] =
    ibans.length > 1 && finanzamt.length !== 1 ? ['multipleRecipientIbans'] : []
  return { recipientIban: chosen, bic: candidates.get(chosen), ibanWarnings }
}

function findRecipientName(lines: string[], recipientIban?: string): string | undefined {
  const dienststelle = lines.find((l) => squash(l).includes('DIENSTSTELLE'))
  if (dienststelle) return dedupeColumns(dienststelle)

  // fallback: the line right above the recipient IBAN
  if (recipientIban) {
    const idx = lines.findIndex((l) => squash(l).includes(recipientIban))
    const before = lines[idx - 1]?.trim()
    if (before && !/\d{4}/.test(before)) return dedupeColumns(before)
  }
  return undefined
}

/** The slip is printed twice side by side; merged rows read "X … X". */
function dedupeColumns(line: string): string {
  const s = line.trim()
  const mid = Math.floor(s.length / 2)
  if (s.length % 2 === 1 && s.slice(0, mid) === s.slice(mid + 1) && s[mid] === ' ') {
    return s.slice(0, mid)
  }
  return s
}

function findTaxItems(lines: string[]): TaxItem[] {
  const seen = new Map<string, TaxItem>()
  for (const line of lines) {
    for (const m of line.matchAll(TAX_LINE_RE)) {
      const [, code, period, amount] = m
      if (!isKnownTaxCode(code)) continue
      // 6-digit periods are MMJJJJ – reject impossible months ("136500" etc.)
      const month = /^(\d{2})\d{4}$/.exec(period)?.[1]
      if (month !== undefined && (Number(month) < 1 || Number(month) > 12)) continue
      const key = `${code} ${period}`
      const amountCents = amount ? (parseAmountToCents(amount) ?? undefined) : undefined
      const existing = seen.get(key)
      if (!existing) seen.set(key, { code, period, amountCents })
      else if (existing.amountCents === undefined) existing.amountCents = amountCents
    }
  }
  return [...seen.values()]
}

function findAmount(
  lines: string[],
  taxItems: TaxItem[],
  warnings: ParseWarning[],
): number | undefined {
  const fromTaxItems = taxItems.length
    ? taxItems.reduce<number | undefined>(
        (sum, t) =>
          sum === undefined || t.amountCents === undefined ? undefined : sum + t.amountCents,
        0,
      )
    : undefined

  let fromControl: number | undefined
  const counts = new Map<number, number>()
  for (const line of lines) {
    const squashed = squash(line)
    const control = CONTROL_RE.exec(squashed)
    if (control && fromControl === undefined) fromControl = Number(control[1])

    for (const m of line.match(AMOUNT_RE) ?? []) {
      const cents = parseAmountToCents(m)
      if (cents !== null) counts.set(cents, (counts.get(cents) ?? 0) + 1)
    }
  }
  const fromPrinted = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const amount = fromTaxItems ?? fromControl ?? fromPrinted
  if (amount === undefined) {
    warnings.push('noAmount')
    return undefined
  }
  const checks = [fromTaxItems, fromControl, fromPrinted].filter((v): v is number => v !== undefined)
  if (checks.some((v) => v !== amount)) warnings.push('amountMismatch')
  return amount
}
