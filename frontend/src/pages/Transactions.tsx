import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadFile, transactionsCsv } from '@/lib/download';
import { money } from '@/lib/format';
import { useTransactions } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { Ledger } from '@/components/Ledger';
import { QueryBoundary } from '@/components/ui/Async';
import { Button, Card, EmptyState, Pill } from '@/components/ui/primitives';
import { ReceiptArt } from '@/components/ui/Illustrations';

type Filter = 'all' | 'income' | 'expense';

export default function Transactions() {
  const transactions = useTransactions();
  const open = useUi((s) => s.open);
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <AppShell
      title="Extrato"
      eyebrow="Todos os lançamentos"
      actions={
        <div className="flex gap-2">
          <Link to="/importar" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-text-dim transition hover:text-text focus-ring">
            Importar OFX
          </Link>
          <Button
            variant="secondary"
            disabled={!transactions.data?.length}
            onClick={() => downloadFile('lancamentos.csv', transactionsCsv(transactions.data ?? []), 'text/csv;charset=utf-8')}
          >
            Exportar CSV
          </Button>
          <Button onClick={() => open('transaction')} className="hidden sm:inline-flex">Novo lançamento</Button>
        </div>
      }
    >
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
                  art={<ReceiptArt />}
                  title="Nenhum lançamento ainda"
                  action={<Button onClick={() => open('transaction')}>Adicionar transação</Button>}
                >
                  Toda entrada e saída registrada aparece aqui, agrupada por dia.
                </EmptyState>
              );
            }

            return (
              <>
                <div className="flex items-baseline justify-between px-1">
                  <span className="eyebrow">
                    {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                  <span className={`amount text-[15px] font-medium ${total < 0 ? 'text-text' : 'text-income'}`}>
                    {money(total)}
                  </span>
                </div>
                {filtered.length === 0 ? (
                  <EmptyState title="Nada neste filtro">
                    Troque o filtro para ver outros lançamentos.
                  </EmptyState>
                ) : (
                  <Card className="px-5 pb-2">
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
