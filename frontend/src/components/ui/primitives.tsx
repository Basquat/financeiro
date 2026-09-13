import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clampPct } from '@/lib/format';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Button ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:bg-gold-bright active:bg-gold',
  secondary: 'bg-surface-2 text-text border border-line hover:bg-surface-3',
  ghost: 'text-text-dim hover:text-text hover:bg-surface-2',
  danger: 'bg-expense/15 text-expense border border-expense/30 hover:bg-expense/25',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, block, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[14px] font-medium',
        'transition disabled:opacity-50 disabled:pointer-events-none focus-ring',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-text-dim',
        'transition hover:bg-surface-2 hover:text-text focus-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Spinner ---------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Card ---------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('rounded-lg border border-line bg-surface shadow-card', className)}>
      {children}
    </div>
  );
}

/* ---------- Section header ---------- */

export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[19px] font-medium leading-tight text-text">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-text-mute">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({
  pct,
  tone = 'gold',
}: {
  pct: number;
  tone?: 'gold' | 'income';
}) {
  const value = clampPct(pct);
  const bar = tone === 'income' ? 'bg-income' : 'bg-gold';
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${value}%` }} />
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[14px] font-medium text-text-dim">{title}</p>
      {children && <p className="max-w-xs text-[13px] text-text-mute">{children}</p>}
      {action}
    </div>
  );
}

/* ---------- Pill ---------- */

export function Pill({
  children,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cx(
        'rounded-full px-3 py-1 text-[13px] font-medium transition focus-ring',
        active ? 'bg-gold text-ink' : 'bg-surface-2 text-text-dim hover:text-text',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export { cx };
