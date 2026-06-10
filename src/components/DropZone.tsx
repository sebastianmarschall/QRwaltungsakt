import { useRef, useState, type DragEvent } from 'react'
import { useI18n } from '../i18n'

interface Props {
  onFile: (file: File) => void
  error?: string
}

export function DropZone({ onFile, error }: Props) {
  const { t } = useI18n()
  const [active, setActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setActive(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={handleDrop}
        className={`group flex min-h-72 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40 ${
          active
            ? 'scale-[1.01] border-indigo-400 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div
          className={`flex size-16 items-center justify-center rounded-2xl transition-colors ${
            active
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-400'
          }`}
        >
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" />
            <path d="m9 15 3 3 3-3" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {active ? t('dropActive') : t('dropTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dropHint')}</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
