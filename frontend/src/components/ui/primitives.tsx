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
  primary: 'bg-brand text-canvas shadow-card hover:bg-brand-bright',
  secondary: 'bg-surface text-text border border-line shadow-card hover:bg-surface-2',
  ghost: 'text-text-dim hover:text-text hover:bg-surface-2',
  danger: 'bg-expense/10 text-expense border border-expense/25 hover:bg-expense/15',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, block, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[14px] font-medium',
        'transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-ring',
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
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Card ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-line/80 bg-surface shadow-card', className)}>{children}</div>;
}

/* ---------- Section header ---------- */

export function SectionHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[18px] font-semibold leading-tight text-text">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-text-mute">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Text-styled action used in section headers ("Ver todos", "Adicionar"). */
export function LinkButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        'rounded-full px-3 py-1 text-[13px] font-medium text-brand transition hover:bg-brand-soft focus-ring',
        className,
      )}
      {...rest}
    />
  );
}

/* ---------- Progress ---------- */

const tones = { brand: 'bg-brand', income: 'bg-income', expense: 'bg-expense' };

export function ProgressBar({ pct, tone = 'brand' }: { pct: number; tone?: keyof typeof tones }) {
  const value = clampPct(pct);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700', tones[tone])} style={{ width: `${value}%` }} />
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  title,
  children,
  action,
  art,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface/60 px-6 py-9 text-center">
      {art && <div className="mb-1 h-20 w-24">{art}</div>}
      <p className="text-[15px] font-semibold text-text">{title}</p>
      {children && <p className="max-w-xs text-[13px] text-text-mute">{children}</p>}
      {action}
    </div>
  );
}

/* ---------- Pill ---------- */

export function Pill({ children, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cx(
        'h-8 rounded-full px-3.5 text-[13px] font-medium transition focus-ring',
        active ? 'bg-text text-canvas' : 'border border-line bg-surface text-text-dim hover:text-text',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export { cx };
