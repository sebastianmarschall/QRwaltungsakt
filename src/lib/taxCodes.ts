/**
 * Abgabenarten-Kürzel used on Austrian Finanzamt payment slips
 * (e.g. "U 042026" = Umsatzsteuer for 04/2026).
 */
const TAX_CODES: Record<string, { de: string; en: string }> = {
  U: { de: 'Umsatzsteuer', en: 'VAT' },
  E: { de: 'Einkommensteuer', en: 'Income tax' },
  K: { de: 'Körperschaftsteuer', en: 'Corporate income tax' },
  L: { de: 'Lohnsteuer', en: 'Wage tax' },
  DB: { de: 'Dienstgeberbeitrag', en: 'Employer contribution' },
  DZ: { de: 'Zuschlag zum Dienstgeberbeitrag', en: 'Employer contribution surcharge' },
  KU: { de: 'Kammerumlage', en: 'Chamber levy' },
  NOVA: { de: 'Normverbrauchsabgabe', en: 'Standard consumption tax' },
  KR: { de: 'Kraftfahrzeugsteuer', en: 'Motor vehicle tax' },
  WB: { de: 'Werbeabgabe', en: 'Advertising tax' },
  EG: { de: 'Eingabengebühr', en: 'Filing fee' },
  ZI: { de: 'Zinsen', en: 'Interest' },
  SZ: { de: 'Säumniszuschlag', en: 'Late payment surcharge' },
}

export function isKnownTaxCode(code: string): boolean {
  return code.toUpperCase() in TAX_CODES
}

export function taxCodeLabel(code: string, lang: 'de' | 'en'): string {
  return TAX_CODES[code.toUpperCase()]?.[lang] ?? code.toUpperCase()
}

/** "042026" → "04/2026"; anything unexpected is passed through unchanged. */
export function formatTaxPeriod(period: string): string {
  const m = /^(\d{2})(\d{4})$/.exec(period)
  return m ? `${m[1]}/${m[2]}` : period
}
