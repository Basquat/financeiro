import type { BudgetSettings } from '@/types';

export const DEFAULT_FOOD_PER_PERSON = 550;

/** % da renda usados como estimativa quando o usuário não informa o valor real. */
const EST = { contas: 0.06, transporte: 0.08, saude: 0.04 };
const CLAMP = {
  contas: [150, 600] as const,
  transporte: [120, 700] as const,
  saude: [60, 400] as const,
};

function clamp(v: number, [min, max]: readonly [number, number]) {
  return Math.max(min, Math.min(max, v));
}
const round = (v: number) => Math.round(v * 100) / 100;

export interface BudgetLine {
  key: string;
  label: string;
  amount: number;
  hint?: string;
  estimate?: boolean;
}

export interface BudgetPlan {
  income: number;
  essentials: BudgetLine[];
  essentialsTotal: number;
  discretionary: BudgetLine[];
  leftover: number;
  overspent: boolean;
  emergencyTarget: number;
  emergencyGap: number;
  /** everything, summing to `income` (or to essentials when overspent) */
  total: number;
}

export function buildBudgetPlan(income: number, s: BudgetSettings | null | undefined): BudgetPlan {
  const b = s ?? {};
  const people = Math.max(1, b.householdSize ?? 1);
  const housing = Math.max(0, b.housingCost ?? 0);
  const paysFood = b.paysFood ?? true;
  const foodPerPerson = Math.max(0, b.foodPerPerson ?? DEFAULT_FOOD_PER_PERSON);
  const food = paysFood ? round(foodPerPerson * people) : 0;

  const contas = round(clamp(income * EST.contas, CLAMP.contas));
  const transporte = round(clamp(income * EST.transporte, CLAMP.transporte));
  const saude = round(clamp(income * EST.saude, CLAMP.saude));

  const essentials: BudgetLine[] = [
    { key: 'moradia', label: 'Moradia', amount: housing, hint: housing === 0 ? 'Sem custo de moradia' : 'Aluguel ou prestação' },
    {
      key: 'comida',
      label: 'Alimentação',
      amount: food,
      hint: paysFood ? `${people} pessoa(s) × ${foodPerPerson.toLocaleString('pt-BR')}` : 'Você não paga alimentação',
    },
    { key: 'contas', label: 'Contas de casa', amount: contas, hint: 'Luz, água, gás, internet, telefone', estimate: true },
    { key: 'transporte', label: 'Transporte', amount: transporte, hint: 'Ônibus, combustível, app', estimate: true },
    { key: 'saude', label: 'Saúde', amount: saude, hint: 'Farmácia, plano, consultas', estimate: true },
  ];

  const essentialsTotal = round(essentials.reduce((t, l) => t + l.amount, 0));
  const leftover = round(income - essentialsTotal);
  const overspent = leftover <= 0;

  const emergencyTarget = round(essentialsTotal * 6);
  const emergencyGap = round(Math.max(0, emergencyTarget - Math.max(0, b.emergencySaved ?? 0)));

  let discretionary: BudgetLine[] = [];
  if (!overspent) {
    let reserva = 0;
    let lazer = 0;
    let invest = 0;
    if (emergencyGap > 0) {
      reserva = Math.min(round(leftover * 0.4), emergencyGap);
      lazer = round(leftover * 0.25);
      invest = round(leftover - reserva - lazer);
    } else {
      lazer = round(leftover * 0.3);
      invest = round(leftover - lazer);
    }
    discretionary = [
      { key: 'lazer', label: 'Lazer e gastos pessoais', amount: lazer, hint: 'Restaurante, streaming, roupa, hobbies' },
      {
        key: 'reserva',
        label: 'Reserva de emergência',
        amount: reserva,
        hint:
          emergencyGap > 0
            ? `Faltam ${emergencyGap.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para 6 meses de custos`
            : 'Reserva completa 🎉 — o valor foi para investimento',
      },
      { key: 'investimento', label: 'Investimento', amount: invest, hint: 'Para objetivos de médio e longo prazo' },
    ];
  }

  const total = overspent
    ? essentialsTotal
    : round(essentialsTotal + discretionary.reduce((t, l) => t + l.amount, 0));

  return {
    income,
    essentials,
    essentialsTotal,
    discretionary,
    leftover,
    overspent,
    emergencyTarget,
    emergencyGap,
    total,
  };
}

/** Quanto o plano sugere investir por mês (0 se não sobra nada). */
export function suggestedMonthlyInvestment(plan: BudgetPlan): number {
  return plan.discretionary.find((l) => l.key === 'investimento')?.amount ?? 0;
}
