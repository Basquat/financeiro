import { cx } from './primitives';

/** One ring (you) with the lime plus of finance+. Same mark as the favicon and the Android icons. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? '#F4F1EA' : '#1D4A3A';
  const ring = inverted ? '#1D4A3A' : '#F4F1EA';
  return (
    <svg viewBox="0 0 32 32" className={cx('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill={bg} />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke={ring} strokeWidth="2" />
      <path d="M16 12.75v6.5M12.75 16h6.5" stroke="#D4EF6F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark inverted={inverted} />
      <span
        className={cx(
          'font-display text-[19px] font-semibold tracking-[-0.03em]',
          inverted ? 'text-paper' : 'text-text',
        )}
      >
        finance<span className={inverted ? 'text-lime' : 'text-brand'}>+</span>
      </span>
    </span>
  );
}
