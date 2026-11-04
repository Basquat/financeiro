// Hand-built SVG art (no external images). Colors are the theme tokens as literals.
const PINE = '#1D4A3A';
const DEEP = '#13342A';
const LIME = '#D4EF6F';
const PAPER = '#F4F1EA';
const LINE = '#CFC8B9';

/** Login hero: two big coins overlapping, the shared lens in lime, a home and a small rising chart. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 420" className={className} aria-hidden>
      <defs>
        <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke={PAPER} strokeOpacity="0.07" />
        </pattern>
        <clipPath id="hero-lens">
          <circle cx="200" cy="230" r="120" />
        </clipPath>
      </defs>
      <rect width="480" height="420" fill="url(#hero-grid)" />

      {/* coins */}
      <circle cx="200" cy="230" r="120" fill={DEEP} stroke={PAPER} strokeOpacity="0.85" strokeWidth="2" />
      <circle cx="290" cy="230" r="120" fill="none" stroke={PAPER} strokeOpacity="0.85" strokeWidth="2" />
      <circle cx="290" cy="230" r="120" fill={LIME} clipPath="url(#hero-lens)" />
      <path d="M245 210v40M225 230h40" stroke={DEEP} strokeWidth="6" strokeLinecap="round" />
      <circle cx="200" cy="230" r="104" fill="none" stroke={PAPER} strokeOpacity="0.18" strokeDasharray="2 7" />
      <circle cx="290" cy="230" r="104" fill="none" stroke={PAPER} strokeOpacity="0.18" strokeDasharray="2 7" />

      {/* house on the left coin */}
      <path d="M118 236l34-28 34 28v34h-68z" fill="none" stroke={PAPER} strokeWidth="2" strokeLinejoin="round" />
      <rect x="143" y="248" width="18" height="22" rx="2" fill={PAPER} fillOpacity="0.9" />

      {/* rising bars on the right coin */}
      <rect x="318" y="236" width="12" height="34" rx="4" fill={PAPER} fillOpacity="0.9" />
      <rect x="338" y="218" width="12" height="52" rx="4" fill={PAPER} fillOpacity="0.9" />
      <rect x="358" y="196" width="12" height="74" rx="4" fill={LIME} />

      {/* receipt card floating top-left */}
      <g transform="translate(46 54) rotate(-6)">
        <rect width="132" height="78" rx="12" fill={PAPER} />
        <rect x="14" y="16" width="56" height="8" rx="4" fill={PINE} />
        <rect x="14" y="34" width="96" height="6" rx="3" fill={LINE} />
        <rect x="14" y="48" width="76" height="6" rx="3" fill={LINE} />
        <circle cx="110" cy="20" r="8" fill={LIME} />
      </g>

      {/* goal chip bottom-right */}
      <g transform="translate(330 340) rotate(4)">
        <rect width="118" height="44" rx="22" fill={PAPER} />
        <circle cx="22" cy="22" r="11" fill={PINE} />
        <path d="M18 22l3 3 6-6" stroke={LIME} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="18" width="58" height="8" rx="4" fill={LINE} />
      </g>

      {/* sparkles */}
      <path d="M408 92l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill={LIME} />
      <circle cx="80" cy="330" r="5" fill={LIME} />
      <circle cx="430" cy="190" r="3" fill={PAPER} fillOpacity="0.6" />
    </svg>
  );
}

/** Empty ledger: a receipt with torn bottom. */
export function ReceiptArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <ellipse cx="60" cy="88" rx="38" ry="5" className="fill-surface-3" fillOpacity="0.5" />
      <path d="M32 10h56v66l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5z" className="fill-surface stroke-surface-3" strokeWidth="2" strokeLinejoin="round" />
      <rect x="42" y="22" width="24" height="5" rx="2.5" className="fill-brand" />
      <rect x="42" y="35" width="36" height="4" rx="2" className="fill-surface-3" />
      <rect x="42" y="45" width="28" height="4" rx="2" className="fill-surface-3" />
      <rect x="42" y="55" width="32" height="4" rx="2" className="fill-surface-3" />
      <circle cx="92" cy="22" r="11" fill={LIME} />
      <path d="M92 17v10M87 22h10" stroke={DEEP} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Empty goals: a flag on a hill under a lime sun. */
export function FlagArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <circle cx="86" cy="26" r="13" fill={LIME} />
      <path d="M8 84c18-26 38-40 58-40s34 14 46 40z" className="fill-surface stroke-surface-3" strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 46V14" className="stroke-brand" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M62 15h24l-6 7 6 7H62z" className="fill-brand" />
      <path d="M28 70h10M44 64h8" className="stroke-text-mute" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Empty installments: a card cut into slices, one paid. */
export function CardArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <ellipse cx="60" cy="88" rx="40" ry="5" className="fill-surface-3" fillOpacity="0.5" />
      <rect x="18" y="18" width="84" height="56" rx="10" className="fill-surface stroke-surface-3" strokeWidth="2" />
      <rect x="18" y="30" width="84" height="10" className="fill-brand" />
      <rect x="28" y="52" width="14" height="10" rx="3" fill={LIME} />
      <rect x="46" y="52" width="14" height="10" rx="3" fill="none" className="stroke-surface-3" strokeWidth="2" />
      <rect x="64" y="52" width="14" height="10" rx="3" fill="none" className="stroke-surface-3" strokeWidth="2" />
      <rect x="82" y="52" width="10" height="10" rx="3" fill="none" className="stroke-surface-3" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}
