/**
 * Parses user/PDF amount strings into integer cents.
 * Accepts Austrian ("1.365,00", "1365,00") and dot-decimal ("1365.00") forms.
 * Returns null when the string is not a clean amount.
 */
export function parseAmountToCents(input: string): number | null {
  const s = input.trim().replace(/\s/g, '').replace(/€/g, '')
  if (!s) return null

  let m = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(s)
  if (m) return Number(m[1].replace(/\./g, '')) * 100 + Number(m[2])

  m = /^(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/.exec(s)
  if (m) return Number(m[1].replace(/,/g, '')) * 100 + Number(m[2])

  m = /^\d+$/.exec(s)
  if (m) return Number(s) * 100

  return null
}

/** EPC line 8 requires a dot decimal: 136500 → "EUR1365.00" (without prefix here). */
export function centsToEpcAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

/** Display formatting: 136500 → "1.365,00" (de) / "1,365.00" (en). */
export function centsToDisplay(cents: number, lang: 'de' | 'en'): string {
  // de-DE, not de-AT: Austrian CLDR groups with narrow spaces ("1 365,00"),
  // but Zahlscheine and banking apps print the dot form ("1.365,00")
  return (cents / 100).toLocaleString(lang === 'de' ? 'de-DE' : 'en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
