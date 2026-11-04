import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useData';
import { apiError } from '@/lib/api';
import { notTransfer } from '@/lib/categories';
import { money, monthKey } from '@/lib/format';
import { recurringService } from '@/services/recurringService';
import { Button, Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';

export const RECURRING_KEY = ['recurring'] as const;

const planLink = (
  <Link to="/planejar" className="rounded-full px-3 py-1 text-[13px] font-medium text-brand hover:bg-brand-soft focus-ring">
    Ajustar
  </Link>
);

/** Spending this month against the limit set for each category. */
export function LimitsCard() {
  const { user } = useAuth();
  const transactions = useTransactions();
  const limits = user?.categoryBudgets ?? {};

  const spent = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM');
    const map = new Map<string, number>();
    for (const t of (transactions.data ?? []).filter(notTransfer)) {
      if (t.amount < 0 && monthKey(t.transactionDate) === month) {
        map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
      }
    }
    return map;
  }, [transactions.data]);

  const rows = Object.entries(limits)
    .map(([category, limit]) => ({ category, limit, used: spent.get(category) ?? 0 }))
    .sort((a, b) => b.used / b.limit - a.used / a.limit);

  return (
    <Card className="p-5">
      <SectionHeader title="Limites do mês" hint="Gasto por categoria" action={planLink} />
      {rows.length === 0 ? (
        <p className="py-4 text-[13px] text-text-mute">
          Defina quanto quer gastar por categoria (ex.: Mercado R$ 900) e acompanhe aqui.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map(({ category, limit, used }) => {
            const pct = (used / limit) * 100;
            return (
              <li key={category}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate text-text">{category}</span>
                  <span className="amount shrink-0 text-text-dim">
                    {money(used)} <span className="text-text-mute">de {money(limit)}</span>
                  </span>
                </div>
                <ProgressBar pct={pct} tone={pct > 100 ? 'expense' : 'brand'} />
                {pct > 100 && <p className="mt-1 text-[12px] text-expense">Passou {money(used - limit)} do limite</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Monthly bills/incomes not posted yet this month, one tap each. */
export function BillsCard() {
  const qc = useQueryClient();
  const recurring = useQuery({ queryKey: RECURRING_KEY, queryFn: recurringService.list });
  const [busy, setBusy] = useState<number | null>(null);
  const list = recurring.data ?? [];
  const pending = list.filter((r) => r.pendingThisMonth);

  async function post(id: number) {
    setBusy(id);
    try {
      await recurringService.post(id);
      toast.success('Lançado');
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader title="Contas do mês" hint="Fixas que ainda não foram lançadas" action={planLink} />
      {list.length === 0 ? (
        <p className="py-4 text-[13px] text-text-mute">
          Cadastre aluguel, salário e assinaturas uma vez; todo mês elas aparecem aqui para lançar com um toque.
        </p>
      ) : pending.length === 0 ? (
        <p className="py-4 text-[13px] text-income">Tudo lançado este mês ✓</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {pending.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-text">{r.title}</p>
                <p className="text-[12px] text-text-mute">
                  dia {r.dayOfMonth} · {r.accountName}
                </p>
              </div>
              <span className={`amount shrink-0 text-[14px] ${r.type === 'INCOME' ? 'text-income' : 'text-text'}`}>
                {r.type === 'INCOME' ? '+' : '−'} {money(r.amount)}
              </span>
              <Button variant="secondary" loading={busy === r.id} onClick={() => void post(r.id)} className="h-8 px-3">
                Lançar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
