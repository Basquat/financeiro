import { initials } from '@/lib/format';
import type { UserSummary } from '@/types';
import { cx } from './primitives';

/** Deterministic accent per person so "who spent it" is scannable across the app. */
const ACCENTS = ['bg-daniel/20 text-daniel', 'bg-jamile/20 text-jamile', 'bg-gold/20 text-gold'];

function accentFor(id: number | undefined): string {
  if (id == null) return 'bg-surface-3 text-text-mute';
  return ACCENTS[(Math.max(1, id) - 1) % ACCENTS.length];
}

export function PersonDot({
  person,
  size = 'md',
}: {
  person?: UserSummary | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-[15px]' : 'h-8 w-8 text-[12px]';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        dims,
        accentFor(person?.id),
      )}
      title={person?.name ?? undefined}
    >
      {person?.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        initials(person?.name)
      )}
    </span>
  );
}

export function PeopleStack({ people }: { people: Array<UserSummary | null | undefined> }) {
  const seen = new Set<number>();
  const unique = people.filter((p): p is UserSummary => {
    if (!p || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  if (unique.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {unique.map((p) => (
        <span key={p.id} className="rounded-full ring-2 ring-surface">
          <PersonDot person={p} size="sm" />
        </span>
      ))}
    </div>
  );
}
