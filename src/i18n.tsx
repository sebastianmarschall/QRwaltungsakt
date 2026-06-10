import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'de' | 'en'

const STRINGS = {
  de: {
    tagline: 'Die Zahlungsanweisungsabtippvermeidungsmaschine.',
    dropTitle: 'Zahlungsanweisung hier ablegen',
    dropHint: 'PDF vom Finanzamt Österreich – oder klicken, um eine Datei auszuwählen',
    dropActive: 'Loslassen zum Einlesen',
    onlyPdf: 'Bitte eine PDF-Datei auswählen.',
    parseError: 'Diese PDF konnte nicht gelesen werden. Ist es eine Zahlungsanweisung des Finanzamts?',
    trustTitle: '100 % lokal – deine Daten bleiben bei dir',
    trustBody:
      'Die PDF wird ausschließlich in deinem Browser verarbeitet. Es gibt keinen Server, keine Cookies, kein Tracking. Eine strikte Content-Security-Policy verbietet der App jede Verbindung nach außen – du kannst das Internet ausschalten und sie funktioniert trotzdem (Netzwerk-Tab in den DevTools bleibt leer).',
    parsedFrom: 'Gelesen aus',
    reset: 'Andere Datei',
    fieldRecipient: 'Empfänger:in',
    fieldIban: 'IBAN',
    fieldBic: 'BIC (optional)',
    fieldAmount: 'Betrag (EUR)',
    fieldRemittance: 'Verwendungszweck',
    remittanceHint:
      'Finanzamts-Format: Steuernummer, dann Zeitraum (JJMM)+Betrag in Cent+Abgabenart. Banking-Apps zeigen das als benannte Position an.',
    taxDetected: 'Erkannt',
    errRequired: 'Pflichtfeld',
    errIban: 'Ungültige IBAN (Prüfsumme)',
    errBic: 'Ungültiger BIC',
    errNameLong: 'Maximal 70 Zeichen',
    errRemittanceLong: 'Maximal 140 Zeichen',
    errAmount: 'Ungültiger Betrag (0,01 € bis 999.999.999,99 €)',
    warnTitle: 'Bitte prüfen',
    'warn.noIban': 'Keine Empfänger-IBAN gefunden – bitte manuell eintragen.',
    'warn.multipleRecipientIbans':
      'Mehrere mögliche Empfänger-IBANs gefunden – bitte genau prüfen.',
    'warn.noAmount': 'Kein Betrag gefunden – bitte manuell eintragen.',
    'warn.amountMismatch':
      'Die Beträge auf dem Zahlschein widersprechen sich – bitte genau prüfen.',
    'warn.noTaxNumber': 'Keine Steuernummer gefunden – bitte Verwendungszweck prüfen.',
    'warn.noRecipientName': 'Kein Empfängername gefunden – bitte manuell eintragen.',
    qrTitle: 'Mit Banking-App scannen',
    qrInvalid: 'QR-Code erscheint, sobald alle Felder gültig sind.',
    download: 'PNG speichern',
    print: 'Drucken',
    payloadDetails: 'Was steckt im QR-Code?',
    disclaimer:
      'Vor dem Absenden in der Banking-App bitte IBAN und Betrag mit dem Zahlschein vergleichen. Keine Gewähr.',
    footer: 'Open Source · keine Datenübertragung · funktioniert offline',
  },
  en: {
    tagline: 'The Zahlungsanweisungsabtippvermeidungsmaschine. Yes, that is one word.',
    dropTitle: 'Drop your payment slip here',
    dropHint: 'PDF from the Austrian tax office – or click to choose a file',
    dropActive: 'Release to parse',
    onlyPdf: 'Please choose a PDF file.',
    parseError: 'Could not read this PDF. Is it a Finanzamt payment slip?',
    trustTitle: '100% local – your data stays with you',
    trustBody:
      'The PDF is processed entirely in your browser. There is no server, no cookies, no tracking. A strict Content-Security-Policy forbids the app any outside connection – turn off the internet and it still works (the network tab in devtools stays empty).',
    parsedFrom: 'Parsed from',
    reset: 'Another file',
    fieldRecipient: 'Recipient',
    fieldIban: 'IBAN',
    fieldBic: 'BIC (optional)',
    fieldAmount: 'Amount (EUR)',
    fieldRemittance: 'Payment reference',
    remittanceHint:
      'Finanzamt grammar: tax number, then period (YYMM)+amount in cents+tax code. Banking apps render this as a labelled position.',
    taxDetected: 'Detected',
    errRequired: 'Required',
    errIban: 'Invalid IBAN (checksum)',
    errBic: 'Invalid BIC',
    errNameLong: 'Maximum 70 characters',
    errRemittanceLong: 'Maximum 140 characters',
    errAmount: 'Invalid amount (€0.01 to €999,999,999.99)',
    warnTitle: 'Please verify',
    'warn.noIban': 'No recipient IBAN found – please enter it manually.',
    'warn.multipleRecipientIbans': 'Several possible recipient IBANs found – please double-check.',
    'warn.noAmount': 'No amount found – please enter it manually.',
    'warn.amountMismatch': 'The amounts on the slip contradict each other – please double-check.',
    'warn.noTaxNumber': 'No tax number found – please check the payment reference.',
    'warn.noRecipientName': 'No recipient name found – please enter it manually.',
    qrTitle: 'Scan with your banking app',
    qrInvalid: 'The QR code appears once all fields are valid.',
    download: 'Save PNG',
    print: 'Print',
    payloadDetails: 'What is inside the QR code?',
    disclaimer:
      'Before confirming in your banking app, compare IBAN and amount with the payment slip. No warranty.',
    footer: 'Open source · no data transfer · works offline',
  },
} as const

export type StringKey = keyof (typeof STRINGS)['de']

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('qrwaltungsakt-lang')
    if (stored === 'de' || stored === 'en') return stored
    return navigator.language.startsWith('de') ? 'de' : 'en'
  })
  const setLang = (next: Lang) => {
    localStorage.setItem('qrwaltungsakt-lang', next)
    setLangState(next)
  }
  const t = (key: StringKey) => STRINGS[lang][key]
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook lives with its provider
export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
