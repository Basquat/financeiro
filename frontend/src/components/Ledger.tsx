import { Fragment, useMemo } from 'react';
import { dayLabel, signedMoney, toDate } from '@/lib/format';
import type { Transaction } from '@/types';
import { PersonDot } from '@/components/ui/Person';
import { cx } from '@/components/ui/primitives';

function LedgerRow({ tx, onSelect }: { tx: Transaction; onSelect?: (tx: Transaction) => void }) {
  const negative = tx.amount < 0;
  const installment =
    tx.installmentCurrent && tx.installmentTotal ? `${tx.installmentCurrent}/${tx.installmentTotal}` : null;

  const body = (
    <>
      {/* who spent only matters in a shared account */}
      {tx.account?.isJoint && <PersonDot person={tx.user} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-text">{tx.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-text-mute">
          <span className="rounded-full bg-surface-2 px-2 py-px text-text-dim">{tx.category}</span>
          {tx.account && <span className="truncate">{tx.account.name}</span>}
          {installment && <span className="amount">· {installment}</span>}
        </p>
      </div>
      <span className={cx('amount shrink-0 text-[14px] font-medium', negative ? 'text-text' : 'text-income')}>
        {signedMoney(tx.amount)}
      </span>
    </>
  );

  if (!onSelect) return <div className="flex items-center gap-3 py-3">{body}</div>;
  return (
    <button
      onClick={() => onSelect(tx)}
      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-3 text-left transition hover:bg-surface-2 focus-ring"
    >
      {body}
    </button>
  );
}

export function Ledger({
  transactions,
  limit,
  onSelect,
}: {
  transactions: Transaction[];
  limit?: number;
  onSelect?: (tx: Transaction) => void;
}) {
  const groups = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => toDate(b.transactionDate).getTime() - toDate(a.transactionDate).getTime(),
    );
    const sliced = limit ? sorted.slice(0, limit) : sorted;
    const map = new Map<string, Transaction[]>();
    for (const tx of sliced) {
      const key = tx.transactionDate.slice(0, 10);
      const bucket = map.get(key);
      if (bucket) bucket.push(tx);
      else map.set(key, [tx]);
    }
    return [...map.entries()];
  }, [transactions, limit]);

  return (
    <div>
      {groups.map(([day, rows]) => (
        <Fragment key={day}>
          <div className="sticky top-0 z-[1] flex items-center justify-between bg-surface/95 pb-1 pt-3 backdrop-blur">
            <span className="eyebrow">{dayLabel(rows[0].transactionDate)}</span>
            {rows.length > 1 && (
              <span className="amount text-[11px] text-text-mute">
                {signedMoney(rows.reduce((s, t) => s + t.amount, 0))}
              </span>
            )}
          </div>
          <div className="divide-y divide-line-soft">
            {rows.map((tx) => (
              <LedgerRow key={tx.id} tx={tx} onSelect={onSelect} />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
