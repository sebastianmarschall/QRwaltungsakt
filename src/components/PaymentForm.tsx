import type { EpcErrors } from '../lib/epc'
import { useI18n, type StringKey } from '../i18n'

export interface FormValues {
  name: string
  iban: string
  bic: string
  amount: string
  remittance: string
}

export type IbanCheck = { tone: 'ok' | 'warn' | 'alert'; text: string } | null

interface Props {
  values: FormValues
  errors: EpcErrors
  onChange: (values: FormValues) => void
  ibanCheck?: IbanCheck
}

const ERROR_KEYS: Record<string, StringKey> = {
  'name.required': 'errRequired',
  'name.tooLong': 'errNameLong',
  'iban.required': 'errRequired',
  'iban.invalid': 'errIban',
  'bic.invalid': 'errBic',
  'amount.required': 'errRequired',
  'amount.outOfRange': 'errAmount',
  'remittance.tooLong': 'errRemittanceLong',
}

export function PaymentForm({ values, errors, onChange, ibanCheck }: Props) {
  const { t } = useI18n()

  const set = (field: keyof FormValues) => (value: string) =>
    onChange({ ...values, [field]: value })

  const errorText = (field: keyof EpcErrors): string | undefined => {
    const code = errors[field === 'amount' ? 'amount' : field]
    return code ? t(ERROR_KEYS[`${field}.${code}`] ?? 'errRequired') : undefined
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <Field
        label={t('fieldRecipient')}
        value={values.name}
        onChange={set('name')}
        error={errorText('name')}
        maxLength={70}
      />
      <div className="flex flex-col gap-1.5">
        <Field
          label={t('fieldIban')}
          value={values.iban}
          onChange={set('iban')}
          error={errorText('iban')}
          mono
          placeholder="AT.. .... .... .... ...."
        />
        {ibanCheck && !errorText('iban') && (
          <p
            className={`flex items-start gap-1.5 text-xs font-medium ${
              ibanCheck.tone === 'ok'
                ? 'text-emerald-600 dark:text-emerald-400'
                : ibanCheck.tone === 'warn'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            <span aria-hidden>{ibanCheck.tone === 'ok' ? '✓' : '⚠'}</span>
            {ibanCheck.text}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t('fieldBic')}
          value={values.bic}
          onChange={set('bic')}
          error={errorText('bic')}
          mono
        />
        <Field
          label={t('fieldAmount')}
          value={values.amount}
          onChange={set('amount')}
          error={errorText('amount')}
          mono
          placeholder="0,00"
          inputMode="decimal"
        />
      </div>
      <Field
        label={t('fieldRemittance')}
        value={values.remittance}
        onChange={set('remittance')}
        error={errorText('remittance')}
        hint={t('remittanceHint')}
        maxLength={140}
      />
    </form>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  mono?: boolean
  maxLength?: number
  placeholder?: string
  inputMode?: 'decimal'
}

function Field({ label, value, onChange, error, hint, mono, maxLength, placeholder, inputMode }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        inputMode={inputMode}
        spellCheck={false}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-300 focus:ring-4 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600 ${
          mono ? 'font-mono text-[15px]' : ''
        } ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/70'
            : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 dark:border-slate-700 dark:focus:border-indigo-500'
        }`}
      />
      {error ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}
