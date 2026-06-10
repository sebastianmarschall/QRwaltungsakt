import { useMemo, useState } from 'react'
import { DropZone } from './components/DropZone'
import { PaymentForm, type FormValues } from './components/PaymentForm'
import { QrPanel } from './components/QrPanel'
import { useI18n, type StringKey } from './i18n'
import { buildEpcPayload, validateEpc, type EpcInput } from './lib/epc'
import { parseAmountToCents, centsToDisplay } from './lib/amount'
import { formatIban } from './lib/iban'
import { extractTextItems } from './lib/pdf'
import { parsePayment, reconstructLines, type ParseWarning } from './lib/parser'

const EMPTY: FormValues = { name: '', iban: '', bic: '', amount: '', remittance: '' }

type Stage =
  | { kind: 'idle'; error?: StringKey }
  | { kind: 'parsing' }
  | { kind: 'ready'; fileName: string; warnings: ParseWarning[] }

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [values, setValues] = useState<FormValues>(EMPTY)

  const handleFile = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStage({ kind: 'idle', error: 'onlyPdf' })
      return
    }
    setStage({ kind: 'parsing' })
    try {
      const items = await extractTextItems(file)
      const parsed = parsePayment(reconstructLines(items))
      setValues({
        name: parsed.recipientName ?? '',
        iban: parsed.recipientIban ? formatIban(parsed.recipientIban) : '',
        bic: parsed.bic ?? '',
        amount: parsed.amountCents !== undefined ? centsToDisplay(parsed.amountCents, 'de') : '',
        remittance: parsed.remittanceSuggestion ?? '',
      })
      setStage({ kind: 'ready', fileName: file.name, warnings: parsed.warnings })
    } catch {
      setStage({ kind: 'idle', error: 'parseError' })
    }
  }

  const reset = () => {
    setValues(EMPTY)
    setStage({ kind: 'idle' })
  }

  const { errors, payload } = useMemo(() => {
    const epcInput: EpcInput = {
      name: values.name,
      iban: values.iban,
      bic: values.bic.trim() || undefined,
      amountCents: parseAmountToCents(values.amount) ?? undefined,
      purpose: 'TAXS',
      remittance: values.remittance,
    }
    const errors = validateEpc(epcInput)
    return {
      errors,
      payload: Object.keys(errors).length === 0 ? buildEpcPayload(epcInput) : null,
    }
  }, [values])

  const summary = `${values.name} · ${values.iban} · € ${values.amount}`

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 font-mono text-sm font-bold text-white shadow-md shadow-indigo-600/30">
            QR
          </div>
          <div>
            <h1 className="text-lg leading-tight font-bold tracking-tight">QRwaltungsakt</h1>
            <p className="text-xs break-words text-slate-500 italic dark:text-slate-400">
              {t('tagline')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Sprache wechseln / switch language"
        >
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        {stage.kind !== 'ready' ? (
          <>
            <DropZone
              onFile={handleFile}
              error={stage.kind === 'idle' && stage.error ? t(stage.error) : undefined}
            />
            <TrustBadge />
          </>
        ) : (
          <div className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {t('parsedFrom')}{' '}
                <span className="font-mono text-slate-700 dark:text-slate-300">{stage.fileName}</span>
              </p>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('reset')}
              </button>
            </div>

            {stage.warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-950/40">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {t('warnTitle')}
                </p>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-700 dark:text-amber-200/80">
                  {stage.warnings.map((w) => (
                    <li key={w}>{t(`warn.${w}` as StringKey)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-8 md:grid-cols-[1fr_auto]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <PaymentForm values={values} errors={errors} onChange={setValues} />
              </section>
              <section className="flex flex-col items-center justify-center md:w-80">
                <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('qrTitle')}
                </h2>
                <QrPanel payload={payload} summary={summary} />
              </section>
            </div>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              {t('disclaimer')}
            </p>
          </div>
        )}
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400 dark:text-slate-600">
        {t('footer')}
      </footer>
    </div>
  )
}

function TrustBadge() {
  const { t } = useI18n()
  return (
    <div className="flex max-w-xl flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {t('trustTitle')}
      </div>
      <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">{t('trustBody')}</p>
    </div>
  )
}
