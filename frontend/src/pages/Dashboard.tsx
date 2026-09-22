import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clampPct, money, monthKey } from '@/lib/format';
import {
  useAccounts,
  useDeleteGoal,
  useDeleteInstallmentPlan,
  useGoals,
  useInstallmentPlans,
  useTransactions,
} from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import type { InstallmentPlan, SharedGoal } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { GoalCard, InstallmentCard } from '@/components/Cards';
import { Ledger } from '@/components/Ledger';
import { QueryBoundary } from '@/components/ui/Async';
import { Button, Card, EmptyState, ProgressBar, SectionHeader, Spinner } from '@/components/ui/primitives';

const monthLabel = () => format(new Date(), 'MMMM', { locale: ptBR });

function HeroBalance() {
  const accounts = useAccounts();

  const { joint, personal } = useMemo(() => {
    const list = accounts.data ?? [];
    const sum = (isJoint: boolean) =>
      list.filter((a) => a.isJoint === isJoint).reduce((t, a) => t + (a.currentBalance ?? 0), 0);
    return { joint: sum(true), personal: sum(false) };
  }, [accounts.data]);

  return (
    <Card className="p-5">
      <p className="text-[13px] text-text-mute">Saldo</p>
      <p className="amount mt-1 font-display text-[34px] font-medium leading-none text-text sm:text-[40px]">
        {accounts.isLoading ? <Spinner className="h-6 w-6 text-text-mute" /> : money(joint + personal)}
      </p>
      <div className="mt-4 flex gap-6 text-[13px]">
        <div>
          <p className="text-text-mute">Contas conjuntas</p>
          <p className="amount mt-0.5 font-medium text-text-dim">{money(joint)}</p>
        </div>
        <div>
          <p className="text-text-mute">Contas pessoais</p>
          <p className="amount mt-0.5 font-medium text-text-dim">{money(personal)}</p>
        </div>
      </div>
    </Card>
  );
}

function useMonthTotals() {
  const transactions = useTransactions();
  return useMemo(() => {
    const now = monthKey(new Date().toISOString());
    const rows = (transactions.data ?? []).filter((t) => monthKey(t.transactionDate) === now);
    return {
      income: rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expense: rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      count: rows.length,
    };
  }, [transactions.data]);
}

function MonthStats() {
  const { income, expense, count } = useMonthTotals();
  const label = monthLabel();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4">
        <p className="text-[12px] text-text-mute">Gastos em {label}</p>
        <p className="amount mt-1 text-[19px] font-medium text-expense">{money(expense)}</p>
        <p className="mt-0.5 text-[12px] text-text-mute">{count} lançamentos</p>
      </Card>
      <Card className="p-4">
        <p className="text-[12px] text-text-mute">Entradas em {label}</p>
        <p className="amount mt-1 text-[19px] font-medium text-income">{money(income)}</p>
        <p className="mt-0.5 text-[12px] text-text-mute">recebido no mês</p>
      </Card>
    </div>
  );
}

function BudgetCard() {
  const { user } = useAuth();
  const { expense } = useMonthTotals();
  const open = useUi((s) => s.open);

  const salary = user?.salary ?? 0;
  const leftover = salary - expense;
  const spentPct = salary > 0 ? (expense / salary) * 100 : 0;

  if (salary === 0) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[13px] font-medium text-text-dim">Quanto sobra no mês</p>
          <p className="mt-0.5 text-[12px] text-text-mute">Informe seu salário para estimar.</p>
        </div>
        <Button variant="secondary" onClick={() => open('salary')}>
          Definir salário
        </Button>
      </Card>
    );
  }

  return (
    <Link to="/planejar" className="block">
      <Card className="p-4 transition hover:border-line/80 hover:bg-surface/80">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] text-text-mute">Sobra estimada em {monthLabel()}</p>
          <span className="text-[12px] text-text-mute">{clampPct(spentPct).toFixed(0)}% da renda usada</span>
        </div>
        <p className={`amount mt-1 text-[24px] font-medium ${leftover < 0 ? 'text-expense' : 'text-income'}`}>
          {money(leftover)}
        </p>
        <div className="mt-3 space-y-1.5">
          <ProgressBar pct={spentPct} tone={spentPct > 100 ? 'gold' : 'income'} />
          <p className="text-[12px] text-text-mute">
            salário {money(salary)} − gastos {money(expense)} · toque para planejar
          </p>
        </div>
      </Card>
    </Link>
  );
}

function GoalGrid({ goals }: { goals: SharedGoal[] }) {
  const open = useUi((s) => s.open);
  const askConfirm = useUi((s) => s.askConfirm);
  const del = useDeleteGoal();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onContribute={() => open('contribute', goal)}
          onEdit={() => open('goal', goal)}
          onDelete={() =>
            askConfirm({
              title: 'Excluir meta?',
              body: `“${goal.title}” será removida. Isso não afeta seu saldo.`,
              confirmLabel: 'Excluir',
              danger: true,
              onConfirm: () => del.mutateAsync(goal.id),
            })
          }
        />
      ))}
    </div>
  );
}

function InstallmentGrid({ plans }: { plans: InstallmentPlan[] }) {
  const open = useUi((s) => s.open);
  const askConfirm = useUi((s) => s.askConfirm);
  const del = useDeleteInstallmentPlan();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {plans.map((plan) => (
        <InstallmentCard
          key={plan.id}
          plan={plan}
          onPay={() => open('pay-installment', plan)}
          onEdit={() => open('installment', plan)}
          onDelete={() =>
            askConfirm({
              title: 'Excluir parcelamento?',
              body: `“${plan.title}” será removido do acompanhamento.`,
              confirmLabel: 'Excluir',
              danger: true,
              onConfirm: () => del.mutateAsync(plan.id),
            })
          }
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const transactions = useTransactions();
  const installments = useInstallmentPlans();
  const goals = useGoals();
  const open = useUi((s) => s.open);

  return (
    <AppShell title="Início">
      <div className="space-y-8">
        <div className="space-y-3">
          <HeroBalance />
          <MonthStats />
          <BudgetCard />
        </div>

        <section>
          <SectionHeader
            title="Lançamentos recentes"
            action={
              <Link to="/transactions" className="text-[13px] font-medium text-gold hover:underline">
                Ver todos
              </Link>
            }
          />
          <Card className="px-4">
            <QueryBoundary query={transactions}>
              {(list) =>
                list.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      title="Nenhum lançamento ainda"
                      action={<Button onClick={() => open('transaction')}>Adicionar transação</Button>}
                    >
                      Registre a primeira entrada ou saída para ver o histórico aqui.
                    </EmptyState>
                  </div>
                ) : (
                  <Ledger transactions={list} limit={6} onSelect={(tx) => open('transaction', tx)} />
                )
              }
            </QueryBoundary>
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Parcelamentos"
            hint="Compras que você ainda está pagando"
            action={
              <button
                onClick={() => open('installment')}
                className="text-[13px] font-medium text-gold hover:underline"
              >
                Adicionar
              </button>
            }
          />
          <QueryBoundary query={installments}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState
                  title="Sem parcelamentos"
                  action={
                    <Button variant="secondary" onClick={() => open('installment')}>
                      Adicionar parcelamento
                    </Button>
                  }
                >
                  Cadastre uma compra parcelada para acompanhar quanto falta.
                </EmptyState>
              ) : (
                <InstallmentGrid plans={list} />
              )
            }
          </QueryBoundary>
        </section>

        <section>
          <SectionHeader
            title="Metas"
            hint="Objetivos de economia"
            action={
              <button
                onClick={() => open('goal')}
                className="text-[13px] font-medium text-gold hover:underline"
              >
                Nova meta
              </button>
            }
          />
          <QueryBoundary query={goals}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState
                  title="Nenhuma meta"
                  action={
                    <Button variant="secondary" onClick={() => open('goal')}>
                      Criar meta
                    </Button>
                  }
                >
                  Defina um objetivo e acompanhe o progresso.
                </EmptyState>
              ) : (
                <GoalGrid goals={list} />
              )
            }
          </QueryBoundary>
        </section>
      </div>
    </AppShell>
  );
}
