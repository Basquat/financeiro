import type { ReactNode } from 'react';
import { useId } from 'react';
import { cx } from './primitives';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string }) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-text-dim">
        {label}
      </label>
      {children({ id })}
      {error ? (
        <p className="text-[12px] text-expense">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

/** Prefix-adorned money input. Value is a plain number string. */
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = '0,00',
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-text-mute">
        R$
      </span>
      <input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        placeholder={placeholder}
        className={cx('field-input pl-9 amount')}
      />
    </div>
  );
}

/** Parse "1.234,56" or "1234.56" or "1234,5" to a number. */
export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, '');
  if (!cleaned) return NaN;
  // If it has a comma, treat comma as decimal separator and strip dots (thousands).
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  return Number(normalized);
}
