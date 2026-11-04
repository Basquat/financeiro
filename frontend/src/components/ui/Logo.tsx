import { cx } from './primitives';

/**
 * Two overlapping circles — the couple — with the shared part (the joint money) in lime.
 * Lens points: circles r=6.5 at x=12.5/19.5 meet at x=16, y=16±√30.
 */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? '#F4F1EA' : '#1D4A3A';
  const ring = inverted ? '#1D4A3A' : '#F4F1EA';
  return (
    <svg viewBox="0 0 32 32" className={cx('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill={bg} />
      <circle cx="12.5" cy="16" r="6.5" fill="none" stroke={ring} strokeWidth="2" />
      <circle cx="19.5" cy="16" r="6.5" fill="none" stroke={ring} strokeWidth="2" />
      <path d="M16 10.52A6.5 6.5 0 0 1 16 21.48A6.5 6.5 0 0 1 16 10.52Z" fill="#D4EF6F" />
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
