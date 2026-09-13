import { Fragment, useMemo } from 'react';
import { dayLabel, signedMoney, toDate } from '@/lib/format';
import type { Transaction } from '@/types';
import { PersonDot } from '@/components/ui/Person';
import { cx } from '@/components/ui/primitives';

function LedgerRow({ tx, onSelect }: { tx: Transaction; onSelect?: (tx: Transaction) => void }) {
  const negative = tx.amount < 0;
  const installment =
    tx.installmentCurrent && tx.installmentTotal
      ? `Parcela ${tx.installmentCurrent}/${tx.installmentTotal}`
      : null;

  const body = (
    <>
      <PersonDot person={tx.user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-text">{tx.title}</p>
        <p className="truncate text-[12px] text-text-mute">
          {tx.category}
          {tx.account ? ` · ${tx.account.name}` : ''}
          {installment ? ` · ${installment}` : ''}
        </p>
      </div>
      <span className={cx('amount shrink-0 text-[14px] font-medium', negative ? 'text-expense' : 'text-income')}>
        {signedMoney(tx.amount)}
      </span>
    </>
  );

  if (!onSelect) {
    return <div className="flex items-center gap-3 py-3">{body}</div>;
  }
  return (
    <button
      onClick={() => onSelect(tx)}
      className="flex w-full items-center gap-3 rounded-md py-3 pl-1 pr-1 text-left transition hover:bg-surface-2 focus-ring"
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
    <div className="divide-y divide-line-soft">
      {groups.map(([day, rows]) => (
        <Fragment key={day}>
          <div className="sticky top-0 z-[1] bg-surface/95 py-2 text-[11px] font-medium uppercase tracking-wide text-text-mute backdrop-blur">
            {dayLabel(rows[0].transactionDate)}
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
