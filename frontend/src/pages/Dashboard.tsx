import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { notTransfer } from '@/lib/categories';
import { clampPct, firstName, money, monthKey, shortDate } from '@/lib/format';
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
import type { InstallmentPlan, SharedGoal, Transaction } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { CashFlowChart } from '@/components/CashFlowChart';
import { GoalCard, InstallmentCard } from '@/components/Cards';
import { Ledger } from '@/components/Ledger';
import { BillsCard, LimitsCard } from '@/components/MonthCards';
import { QueryBoundary } from '@/components/ui/Async';
import { CardArt, FlagArt, ReceiptArt } from '@/components/ui/Illustrations';
import { Button, Card, EmptyState, LinkButton, ProgressBar, SectionHeader, Spinner } from '@/components/ui/primitives';

const monthName = (d = new Date()) => format(d, 'MMMM', { locale: ptBR });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function useMonthTotals() {
  const transactions = useTransactions();
  return useMemo(() => {
    const list = (transactions.data ?? []).filter(notTransfer);
    const sum = (key: string) => {
      const rows = list.filter((t) => monthKey(t.transactionDate) === key);
      return {
        rows,
        income: rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        expense: rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      };
    };
    const now = sum(format(new Date(), 'yyyy-MM'));
    const prev = sum(format(subMonths(new Date(), 1), 'yyyy-MM'));
    return { ...now, prevExpense: prev.expense, prevIncome: prev.income };
  }, [transactions.data]);
}

/* ---------------- Hero ---------------- */

function HeroBalance() {
  const accounts = useAccounts();
  const { joint, personal, count, hasJoint, bills } = useMemo(() => {
    const list = accounts.data ?? [];
    const sum = (isJoint: boolean) =>
      list.filter((a) => a.isJoint === isJoint).reduce((t, a) => t + (a.currentBalance ?? 0), 0);
    return {
      joint: sum(true),
      personal: sum(false),
      count: list.length,
      hasJoint: list.some((a) => a.isJoint),
      // open credit card bills = negative card balances
      bills: list.filter((a) => a.creditCard).reduce((t, a) => t + Math.max(0, -(a.currentBalance ?? 0)), 0),
    };
  }, [accounts.data]);
  const total = joint + personal;
  const jointPct = total > 0 ? clampPct((Math.max(0, joint) / (Math.max(0, joint) + Math.max(0, personal))) * 100) : 50;

  return (
    <div className="relative overflow-hidden rounded-xl bg-pine p-6 text-paper shadow-lift lg:col-span-2">
      {/* motif from the logo: two coins, shared part in lime */}
      <svg viewBox="0 0 300 220" className="pointer-events-none absolute -right-10 -top-6 h-[125%] opacity-90" aria-hidden>
        <defs>
          <clipPath id="hero-lens-clip">
            <circle cx="120" cy="110" r="90" />
          </clipPath>
        </defs>
        <circle cx="120" cy="110" r="90" fill="none" stroke="#F4F1EA" strokeOpacity="0.14" strokeWidth="1.5" />
        <circle cx="190" cy="110" r="90" fill="none" stroke="#F4F1EA" strokeOpacity="0.14" strokeWidth="1.5" />
        <circle cx="190" cy="110" r="90" fill="#D4EF6F" fillOpacity="0.16" clipPath="url(#hero-lens-clip)" />
      </svg>

      <div className="relative">
        <p className="text-[13px] text-paper/70">Saldo total · {count} {count === 1 ? 'conta' : 'contas'}</p>
        <p className="amount mt-2 text-[38px] font-medium leading-none sm:text-[46px]">
          {accounts.isLoading ? <Spinner className="h-7 w-7 text-paper/60" /> : money(total)}
        </p>

        {!hasJoint && bills > 0 && (
          <p className="mt-6 text-[13px] text-paper/70">
            Faturas em aberto <span className="amount font-medium text-paper">{money(bills)}</span>
          </p>
        )}
        {/* the joint/personal split only exists for people who share an account */}
        {hasJoint && (
        <>
        <div className="mt-7 flex h-2 gap-[2px] overflow-hidden rounded-full">
          <div className="rounded-full bg-lime" style={{ width: `${jointPct}%` }} />
          <div className="flex-1 rounded-full bg-paper/25" />
        </div>
        <div className="mt-3 flex gap-8 text-[13px]">
          <div>
            <p className="flex items-center gap-1.5 text-paper/70">
              <span className="h-2 w-2 rounded-full bg-lime" /> Conjuntas
            </p>
            <p className="amount mt-0.5 text-[15px] font-medium">{money(joint)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-paper/70">
              <span className="h-2 w-2 rounded-full bg-paper/40" /> Pessoais
            </p>
            <p className="amount mt-0.5 text-[15px] font-medium">{money(personal)}</p>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function LeftoverCard() {
  const { user } = useAuth();
  const { expense } = useMonthTotals();
  const open = useUi((s) => s.open);
  const salary = user?.salary ?? 0;
  const leftover = salary - expense;
  const spentPct = salary > 0 ? (expense / salary) * 100 : 0;

  if (salary === 0) {
    return (
      <Card className="flex flex-col justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">Sobra do mês</p>
          <p className="mt-2 text-[15px] font-semibold text-text">Quanto vai sobrar?</p>
          <p className="mt-1 text-[13px] text-text-mute">Informe seu salário e a gente estima a sobra de {monthName()}.</p>
        </div>
        <Button variant="secondary" onClick={() => open('salary')}>
          Definir salário
        </Button>
      </Card>
    );
  }

  return (
    <Link to="/planejar" className="group block rounded-lg focus-ring">
      <Card className="flex h-full flex-col justify-between gap-4 p-5 transition group-hover:shadow-lift">
        <div>
          <p className="eyebrow">Sobra em {monthName()}</p>
          <p className={`amount mt-2 text-[30px] font-medium leading-none ${leftover < 0 ? 'text-expense' : 'text-text'}`}>
            {money(leftover)}
          </p>
        </div>
        <div className="space-y-2">
          <ProgressBar pct={spentPct} tone={spentPct > 100 ? 'expense' : 'brand'} />
          <p className="flex items-center justify-between text-[12px] text-text-mute">
            <span>{clampPct(spentPct).toFixed(0)}% do salário gasto</span>
            <span className="flex items-center gap-1 font-medium text-brand">
              Planejar <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </p>
        </div>
      </Card>
    </Link>
  );
}

/* ---------------- KPIs ---------------- */

function delta(now: number, prev: number): string | null {
  if (prev <= 0) return null;
  const d = ((now - prev) / prev) * 100;
  return `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}% vs mês passado`;
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <Card className="p-4">
      <p className="eyebrow">{label}</p>
      <p className="amount mt-2 text-[20px] font-medium text-text">{value}</p>
      <p className="mt-1 truncate text-[12px] text-text-mute">{note ?? ' '}</p>
    </Card>
  );
}

function KpiRow() {
  const { income, expense, rows, prevExpense, prevIncome } = useMonthTotals();
  const plans = useInstallmentPlans().data ?? [];
  const goals = useGoals().data ?? [];
  const open = plans.filter((p) => p.remainingAmount > 0 && p.installmentsLeft > 0);
  const saved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const target = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Entradas no mês" value={money(income)} note={delta(income, prevIncome) ?? `${rows.length} lançamentos`} />
      <Kpi label="Gastos no mês" value={money(expense)} note={delta(expense, prevExpense)} />
      <Kpi
        label="Falta pagar"
        value={money(open.reduce((s, p) => s + p.remainingAmount, 0))}
        note={`${open.length} ${open.length === 1 ? 'parcelamento' : 'parcelamentos'}`}
      />
      <Kpi
        label="Guardado em metas"
        value={money(saved)}
        note={target > 0 ? `${clampPct((saved / target) * 100).toFixed(0)}% de ${money(target)}` : 'nenhuma meta ainda'}
      />
    </div>
  );
}

/* ---------------- Categories ---------------- */

function CategoryBreakdown({ rows }: { rows: Transaction[] }) {
  const cats = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of rows) if (t.amount < 0) map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push(['Outros', rest]);
    return top;
  }, [rows]);
  const total = cats.reduce((s, [, v]) => s + v, 0);
  const max = cats[0]?.[1] ?? 0;

  if (cats.length === 0) {
    return <p className="py-8 text-center text-[13px] text-text-mute">Nenhum gasto registrado em {monthName()}.</p>;
  }
  return (
    <ul className="space-y-3.5">
      {cats.map(([name, value]) => (
        <li key={name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="truncate text-text">{name}</span>
            <span className="amount shrink-0 text-text-dim">
              {money(value)} <span className="text-text-mute">· {((value / total) * 100).toFixed(0)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Upcoming ---------------- */

function UpcomingDues({ plans }: { plans: InstallmentPlan[] }) {
  const open = useUi((s) => s.open);
  const next = plans
    .filter((p) => p.remainingAmount > 0 && p.installmentsLeft > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  if (next.length === 0) {
    return <p className="py-8 text-center text-[13px] text-text-mute">Nada a vencer. Tudo em dia.</p>;
  }
  return (
    <ul className="divide-y divide-line-soft">
      {next.map((p) => {
        const parcel = p.remainingAmount / Math.max(1, p.installmentsLeft);
        const [, mm, dd] = p.dueDate.split('-');
        return (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-surface-2 leading-none">
              <span className="amount text-[15px] font-medium text-text">{dd}</span>
              <span className="mt-0.5 text-[10px] uppercase text-text-mute">
                {format(new Date(2000, Number(mm) - 1, 1), 'MMM', { locale: ptBR })}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-text">{p.title}</p>
              <p className="amount text-[12px] text-text-mute">
                {money(parcel)} · {p.installmentsLeft}x
              </p>
            </div>
            <LinkButton onClick={() => open('pay-installment', p)} title={`Vence ${shortDate(p.dueDate)}`}>
              Pagar
            </LinkButton>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Grids ---------------- */

function GoalGrid({ goals }: { goals: SharedGoal[] }) {
  const open = useUi((s) => s.open);
  const askConfirm = useUi((s) => s.askConfirm);
  const del = useDeleteGoal();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

/* ---------------- Page ---------------- */

export default function Dashboard() {
  const { user } = useAuth();
  const transactions = useTransactions();
  const installments = useInstallmentPlans();
  const goals = useGoals();
  const { rows } = useMonthTotals();
  const open = useUi((s) => s.open);

  return (
    <AppShell
      wide
      title={`${greeting()}, ${firstName(user?.name)}`}
      eyebrow={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
      actions={
        <Button variant="secondary" onClick={() => open('transaction')} className="hidden sm:inline-flex">
          Registrar gasto
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="grid gap-3 lg:grid-cols-3">
          <HeroBalance />
          <LeftoverCard />
        </div>

        <KpiRow />

        <div className="grid gap-3 lg:grid-cols-2">
          <LimitsCard />
          <BillsCard />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <SectionHeader title="Fluxo de caixa" hint="Últimos 6 meses" />
            <QueryBoundary query={transactions}>{(list) => <CashFlowChart transactions={list.filter(notTransfer)} />}</QueryBoundary>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Para onde foi" hint={`Gastos de ${monthName()} por categoria`} />
            <CategoryBreakdown rows={rows} />
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="px-5 pb-2 pt-5 lg:col-span-2">
            <SectionHeader
              title="Últimos lançamentos"
              action={
                <Link to="/transactions" className="rounded-full px-3 py-1 text-[13px] font-medium text-brand hover:bg-brand-soft focus-ring">
                  Ver extrato
                </Link>
              }
            />
            <QueryBoundary query={transactions}>
              {(list) =>
                list.length === 0 ? (
                  <div className="pb-4">
                    <EmptyState
                      art={<ReceiptArt />}
                      title="Nenhum lançamento ainda"
                      action={<Button onClick={() => open('transaction')}>Registrar o primeiro</Button>}
                    >
                      Cada entrada e saída aparece aqui, agrupada por dia.
                    </EmptyState>
                  </div>
                ) : (
                  <Ledger transactions={list} limit={5} onSelect={(tx) => open('transaction', tx)} />
                )
              }
            </QueryBoundary>
          </Card>
          <Card className="px-5 pb-2 pt-5">
            <SectionHeader title="A vencer" hint="Próximas parcelas" />
            <QueryBoundary query={installments}>{(list) => <UpcomingDues plans={list} />}</QueryBoundary>
          </Card>
        </div>

        <section>
          <SectionHeader
            title="Metas"
            hint="O que você está juntando"
            action={<LinkButton onClick={() => open('goal')}>Nova meta</LinkButton>}
          />
          <QueryBoundary query={goals}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState
                  art={<FlagArt />}
                  title="Nenhuma meta ainda"
                  action={<Button variant="secondary" onClick={() => open('goal')}>Criar meta</Button>}
                >
                  Viagem, reserva, casa nova: defina um alvo e acompanhe cada contribuição.
                </EmptyState>
              ) : (
                <GoalGrid goals={list} />
              )
            }
          </QueryBoundary>
        </section>

        <section>
          <SectionHeader
            title="Parcelamentos"
            hint="Compras que ainda estão sendo pagas"
            action={<LinkButton onClick={() => open('installment')}>Adicionar</LinkButton>}
          />
          <QueryBoundary query={installments}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState
                  art={<CardArt />}
                  title="Sem parcelamentos"
                  action={<Button variant="secondary" onClick={() => open('installment')}>Adicionar parcelamento</Button>}
                >
                  Cadastre uma compra parcelada para saber quanto falta e quando vence.
                </EmptyState>
              ) : (
                <InstallmentGrid plans={list} />
              )
            }
          </QueryBoundary>
        </section>
      </div>
    </AppShell>
  );
}
