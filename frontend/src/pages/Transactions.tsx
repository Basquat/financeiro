import { useState } from 'react';
import { money } from '@/lib/format';
import { useTransactions } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { Ledger } from '@/components/Ledger';
import { QueryBoundary } from '@/components/ui/Async';
import { Button, Card, EmptyState, Pill } from '@/components/ui/primitives';

type Filter = 'all' | 'income' | 'expense';

export default function Transactions() {
  const transactions = useTransactions();
  const open = useUi((s) => s.open);
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <AppShell title="Lançamentos">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
              Todos
            </Pill>
            <Pill active={filter === 'income'} onClick={() => setFilter('income')}>
              Receitas
            </Pill>
            <Pill active={filter === 'expense'} onClick={() => setFilter('expense')}>
              Despesas
            </Pill>
          </div>
          <Button onClick={() => open('transaction')} className="hidden sm:inline-flex">
            Adicionar
          </Button>
        </div>

        <QueryBoundary query={transactions}>
          {(list) => {
            const filtered =
              filter === 'all'
                ? list
                : list.filter((t) => (filter === 'income' ? t.amount > 0 : t.amount < 0));
            const total = filtered.reduce((s, t) => s + t.amount, 0);

            if (list.length === 0) {
              return (
                <EmptyState
                  title="Nenhum lançamento ainda"
                  action={<Button onClick={() => open('transaction')}>Adicionar transação</Button>}
                >
                  Toda entrada e saída registrada aparece aqui, agrupada por dia.
                </EmptyState>
              );
            }

            return (
              <>
                <Card className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-text-mute">
                    {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                  <span className="amount text-[14px] font-medium text-text-dim">{money(total)}</span>
                </Card>
                {filtered.length === 0 ? (
                  <EmptyState title="Nada neste filtro">
                    Troque o filtro para ver outros lançamentos.
                  </EmptyState>
                ) : (
                  <Card className="px-4">
                    <Ledger transactions={filtered} onSelect={(tx) => open('transaction', tx)} />
                  </Card>
                )}
              </>
            );
          }}
        </QueryBoundary>
      </div>
    </AppShell>
  );
}
