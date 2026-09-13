import { useMemo, useState } from 'react';
import { clampPct, money } from '@/lib/format';
import {
  buildBudgetPlan,
  DEFAULT_FOOD_PER_PERSON,
  suggestedMonthlyInvestment,
  type BudgetLine,
} from '@/lib/budget';
import { deadlineFromMonths, planInvestment, RETURN_OPTIONS } from '@/lib/invest';
import { useUpdateBudget } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import type { BudgetSettings } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Button, Card, EmptyState, Pill, ProgressBar, cx } from '@/components/ui/primitives';

function pctOf(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function LineRow({ line, income }: { line: BudgetLine; income: number }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[14px] text-text">
          {line.label}
          {line.estimate && (
            <span className="ml-1.5 rounded bg-surface-2 px-1 py-0.5 text-[10px] uppercase tracking-wide text-text-mute">
              estimativa
            </span>
          )}
        </p>
        {line.hint && <p className="mt-0.5 text-[12px] text-text-mute">{line.hint}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="amount text-[14px] font-medium text-text">{money(line.amount)}</p>
        <p className="text-[11px] text-text-mute">{pctOf(line.amount, income).toFixed(0)}%</p>
      </div>
    </div>
  );
}

/* ---------------- Orçamento ---------------- */

function Orcamento() {
  const { user } = useAuth();
  const open = useUi((s) => s.open);
  const save = useUpdateBudget();
  const income = user?.salary ?? 0;
  const b = user?.budget ?? {};

  const [housing, setHousing] = useState(b.housingCost != null ? String(b.housingCost) : '');
  const [noHousing, setNoHousing] = useState(b.housingCost === 0);
  const [people, setPeople] = useState(String(b.householdSize ?? 1));
  const [paysFood, setPaysFood] = useState(b.paysFood ?? true);
  const [foodPer, setFoodPer] = useState(String(b.foodPerPerson ?? DEFAULT_FOOD_PER_PERSON));
  const [saved, setSaved] = useState(b.emergencySaved != null ? String(b.emergencySaved) : '');

  const settings: BudgetSettings = useMemo(
    () => ({
      housingCost: noHousing ? 0 : parseAmount(housing) || 0,
      householdSize: Math.max(1, Number(people) || 1),
      paysFood,
      foodPerPerson: parseAmount(foodPer) || 0,
      emergencySaved: parseAmount(saved) || 0,
    }),
    [housing, noHousing, people, paysFood, foodPer, saved],
  );

  const plan = useMemo(() => buildBudgetPlan(income, settings), [income, settings]);
  const essentialsPct = pctOf(plan.essentialsTotal, income);

  if (income <= 0) {
    return (
      <EmptyState
        title="Defina seu salário primeiro"
        action={<Button onClick={() => open('salary')}>Definir salário</Button>}
      >
        A sugestão de orçamento parte do seu salário líquido mensal.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <p className="text-[13px] font-medium text-text-dim">Seus dados</p>

        <label className="flex items-center gap-2 text-[13px] text-text-dim">
          <input
            type="checkbox"
            checked={noHousing}
            onChange={(e) => setNoHousing(e.target.checked)}
            className="h-4 w-4 rounded border-line bg-surface-2 accent-gold"
          />
          Não pago moradia (moro de graça / com a família)
        </label>
        {!noHousing && (
          <Field label="Aluguel ou prestação da casa">
            {({ id }) => <MoneyInput id={id} value={housing} onChange={setHousing} />}
          </Field>
        )}

        <Field label="Quantas pessoas moram na casa">
          {({ id }) => (
            <input
              id={id}
              inputMode="numeric"
              value={people}
              onChange={(e) => setPeople(e.target.value.replace(/\D/g, '') || '')}
              className="field-input amount w-24"
            />
          )}
        </Field>

        <label className="flex items-center gap-2 text-[13px] text-text-dim">
          <input
            type="checkbox"
            checked={paysFood}
            onChange={(e) => setPaysFood(e.target.checked)}
            className="h-4 w-4 rounded border-line bg-surface-2 accent-gold"
          />
          Eu pago a alimentação da casa
        </label>
        {paysFood && (
          <Field label="Gasto de comida por pessoa / mês" hint="Ajuste para a sua realidade">
            {({ id }) => <MoneyInput id={id} value={foodPer} onChange={setFoodPer} />}
          </Field>
        )}

        <Field label="Já tenho guardado de reserva de emergência" hint="Opcional">
          {({ id }) => <MoneyInput id={id} value={saved} onChange={setSaved} />}
        </Field>

        <Button onClick={() => save.mutate(settings)} loading={save.isLoading} variant="secondary">
          Salvar plano
        </Button>
      </Card>

      {plan.overspent && (
        <Card className="border-expense/40 bg-expense/10 p-4">
          <p className="text-[13px] font-medium text-expense">Seus custos essenciais passam da renda</p>
          <p className="mt-1 text-[12px] text-text-dim">
            Essenciais {money(plan.essentialsTotal)} vs. renda {money(income)}. Reveja moradia ou alimentação.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <p className="font-display text-[17px] text-text">Essenciais</p>
          <p className={cx('text-[12px]', essentialsPct > 55 ? 'text-expense' : 'text-text-mute')}>
            {essentialsPct.toFixed(0)}% da renda · ideal até 50%
          </p>
        </div>
        <ProgressBar pct={essentialsPct} tone={essentialsPct > 55 ? 'gold' : 'income'} />
        <div className="mt-2 divide-y divide-line-soft">
          {plan.essentials.map((l) => (
            <LineRow key={l.key} line={l} income={income} />
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-[13px] font-medium">
          <span className="text-text-dim">Total essenciais</span>
          <span className="amount text-text">{money(plan.essentialsTotal)}</span>
        </div>
      </Card>

      {!plan.overspent && (
        <Card className="p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="font-display text-[17px] text-text">O que sobra</p>
            <p className="text-[12px] text-text-mute">{money(plan.leftover)} para dividir</p>
          </div>
          <div className="mt-1 divide-y divide-line-soft">
            {plan.discretionary.map((l) => (
              <LineRow key={l.key} line={l} income={income} />
            ))}
          </div>
        </Card>
      )}

      <Card className="flex items-center justify-between p-4">
        <span className="text-[13px] font-medium text-text-dim">Total do plano</span>
        <span className="amount text-[15px] font-medium text-text">{money(plan.total)}</span>
      </Card>
    </div>
  );
}

/* ---------------- Investir ---------------- */

function Investir() {
  const { user } = useAuth();
  const open = useUi((s) => s.open);

  const plan = useMemo(
    () => buildBudgetPlan(user?.salary ?? 0, user?.budget ?? {}),
    [user?.salary, user?.budget],
  );
  const suggested = suggestedMonthlyInvestment(plan);

  const [goal, setGoal] = useState('');
  const [months, setMonths] = useState('24');
  const [have, setHave] = useState('');
  const [ret, setRet] = useState(RETURN_OPTIONS[1].key);

  const goalValue = parseAmount(goal) || 0;
  const n = Math.max(1, Number(months) || 1);
  const rate = RETURN_OPTIONS.find((o) => o.key === ret)?.annualRate ?? 0;
  const result = useMemo(
    () => planInvestment(goalValue, n, parseAmount(have) || 0, rate),
    [goalValue, n, have, rate],
  );

  const fitsBudget = suggested > 0 && result.monthlyContribution <= suggested;
  const canPlan = goalValue > 0;

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <Field label="Quanto você quer juntar">
          {({ id }) => <MoneyInput id={id} value={goal} onChange={setGoal} autoFocus />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Em quantos meses">
            {({ id }) => (
              <input
                id={id}
                inputMode="numeric"
                value={months}
                onChange={(e) => setMonths(e.target.value.replace(/\D/g, '') || '')}
                className="field-input amount"
              />
            )}
          </Field>
          <Field label="Já tenho">
            {({ id }) => <MoneyInput id={id} value={have} onChange={setHave} />}
          </Field>
        </div>
        <Field label="Rendimento estimado">
          {({ id }) => (
            <select id={id} value={ret} onChange={(e) => setRet(e.target.value)} className="field-input">
              {RETURN_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </Card>

      {canPlan && (
        <Card className="space-y-3 p-4">
          {result.reachesGoal ? (
            <p className="text-[14px] text-income">
              Só com o que você já tem + rendimento, você chega em {money(goalValue)} em {n} meses.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[13px] text-text-mute">Invista por mês</p>
                <p className="amount mt-1 font-display text-[30px] font-medium text-text">
                  {money(result.monthlyContribution)}
                </p>
              </div>
              <p className="text-[12px] text-text-mute">
                Em {n} meses você chega a{' '}
                <span className="amount text-text-dim">{money(result.projected)}</span>
                {rate > 0 ? ` (com rendimento de ${(rate * 100).toFixed(1)}% a.a.)` : ''}.
              </p>
              {suggested > 0 && (
                <p
                  className={cx(
                    'rounded-md px-3 py-2 text-[12px]',
                    fitsBudget ? 'bg-income/10 text-income' : 'bg-gold-soft text-gold-bright',
                  )}
                >
                  {fitsBudget
                    ? `Cabe no seu orçamento (que sugere ${money(suggested)}/mês para investir).`
                    : `Acima do que seu orçamento sugere (${money(suggested)}/mês). Aumente o prazo ou reduza o objetivo.`}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  open('goal', {
                    targetAmount: goalValue,
                    deadline: deadlineFromMonths(n),
                    icon: 'PiggyBank',
                  })
                }
              >
                Criar como meta
              </Button>
            </>
          )}
        </Card>
      )}

      {!canPlan && (
        <p className="px-1 text-[13px] text-text-mute">
          Informe quanto quer juntar para ver o valor do aporte mensal.
        </p>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Planejar() {
  const [tab, setTab] = useState<'orcamento' | 'investir'>('orcamento');
  return (
    <AppShell title="Planejar">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Pill active={tab === 'orcamento'} onClick={() => setTab('orcamento')}>
            Orçamento
          </Pill>
          <Pill active={tab === 'investir'} onClick={() => setTab('investir')}>
            Investir
          </Pill>
        </div>
        {tab === 'orcamento' ? <Orcamento /> : <Investir />}
      </div>
    </AppShell>
  );
}
