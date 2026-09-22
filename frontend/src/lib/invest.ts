export interface ReturnOption {
  key: string;
  label: string;
  annualRate: number;
}

export const RETURN_OPTIONS: ReturnOption[] = [
  { key: 'none', label: 'Sem rendimento (só guardar)', annualRate: 0 },
  { key: 'savings', label: 'Poupança (~6% a.a.)', annualRate: 0.06 },
  { key: 'fixed', label: 'Renda fixa / Tesouro (~10,5% a.a.)', annualRate: 0.105 },
];

export interface InvestPlan {
  months: number;
  monthlyRate: number;
  /** valor que o aporte inicial vira ao fim do prazo */
  currentGrowsTo: number;
  gap: number;
  /** aporte mensal necessário (0 se já chega lá) */
  monthlyContribution: number;
  reachesGoal: boolean;
  /** valor final se seguir o plano */
  projected: number;
}

/**
 * Quanto investir por mês para chegar em `goal` em `months`, partindo de `current`,
 * a uma taxa anual `annualRate`. Aportes no fim de cada mês.
 */
export function planInvestment(
  goal: number,
  months: number,
  current: number,
  annualRate: number,
): InvestPlan {
  const n = Math.max(1, Math.round(months));
  const i = annualRate > 0 ? Math.pow(1 + annualRate, 1 / 12) - 1 : 0;
  const currentGrowsTo = current * Math.pow(1 + i, n);
  const gap = goal - currentGrowsTo;

  let monthly = 0;
  if (gap > 0) {
    monthly = i > 0 ? (gap * i) / (Math.pow(1 + i, n) - 1) : gap / n;
  }

  const fvContrib =
    i > 0 ? monthly * ((Math.pow(1 + i, n) - 1) / i) : monthly * n;
  const projected = currentGrowsTo + fvContrib;

  return {
    months: n,
    monthlyRate: i,
    currentGrowsTo: round(currentGrowsTo),
    gap: round(gap),
    monthlyContribution: round(Math.max(0, monthly)),
    reachesGoal: gap <= 0,
    projected: round(projected),
  };
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

/** Data alvo a partir de hoje + N meses, no formato YYYY-MM-DD. */
export function deadlineFromMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.max(1, Math.round(months)));
  return d.toISOString().slice(0, 10);
}
