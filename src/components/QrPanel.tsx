import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'

interface Props {
  /** Valid EPC payload, or null while the form has errors. */
  payload: string | null
  summary: string
}

export function QrPanel({ payload, summary }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pngUrl, setPngUrl] = useState<string>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !payload) {
      setPngUrl(undefined)
      return
    }
    // EPC069-12 mandates error correction level M; keep dark-on-light even in
    // dark mode so every scanner can read it
    QRCode.toCanvas(canvas, payload, {
      errorCorrectionLevel: 'M',
      margin: 3,
      width: 288,
      color: { dark: '#0f172b', light: '#ffffff' },
    })
      .then(() => setPngUrl(canvas.toDataURL('image/png')))
      .catch(() => setPngUrl(undefined))
  }, [payload])

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="qr-print-area" className="flex flex-col items-center gap-3">
        <div
          className={`rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5 transition-opacity dark:shadow-black/30 ${
            payload ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <canvas ref={canvasRef} className="block" aria-label={t('qrTitle')} />
        </div>
        {payload && (
          <p className="max-w-72 text-center font-mono text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {summary}
          </p>
        )}
      </div>

      {!payload && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">{t('qrInvalid')}</p>
      )}

      {payload && (
        <>
          <div className="flex gap-2">
            <a
              href={pngUrl}
              download="fa2qr-zahlung.png"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            >
              {t('download')}
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('print')}
            </button>
          </div>

          <details className="w-full max-w-80 text-sm text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer select-none text-center text-xs font-medium hover:text-slate-700 dark:hover:text-slate-200">
              {t('payloadDetails')}
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap dark:bg-slate-800/80">
              {payload}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
