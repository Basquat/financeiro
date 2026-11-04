import {
  BanknotesIcon,
  CheckCircleIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { clampPct, money, shortDate } from '@/lib/format';
import type { Account, InstallmentPlan, SharedGoal } from '@/types';
import { PeopleStack } from '@/components/ui/Person';
import { CardMenu } from '@/components/ui/Menu';
import { Card, ProgressBar, cx } from '@/components/ui/primitives';

const GOAL_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Home: HomeIcon,
  Plane: PaperAirplaneIcon,
  Shield: ShieldCheckIcon,
  Car: TruckIcon,
  PiggyBank: BanknotesIcon,
  Gift: GiftIcon,
  Heart: HeartIcon,
  Sparkles: SparklesIcon,
};

const editIcon = <PencilSquareIcon className="h-4 w-4" />;
const deleteIcon = <TrashIcon className="h-4 w-4" />;

interface CardActions {
  onEdit: () => void;
  onDelete: () => void;
}

/** Ring that fills with the goal's progress; the icon sits in the middle. */
function ProgressRing({ pct, children }: { pct: number; children: ReactNode }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-surface-2" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clampPct(pct) / 100)}
          className="stroke-brand transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      {children}
    </span>
  );
}

export function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: { goal: SharedGoal; onContribute: () => void } & CardActions) {
  const Icon = GOAL_ICONS[goal.icon] ?? SparklesIcon;
  const pct = (goal.currentAmount / goal.targetAmount) * 100;
  const left = Math.max(0, goal.targetAmount - goal.currentAmount);
  const done = goal.currentAmount >= goal.targetAmount;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <ProgressRing pct={pct}>
          <Icon className="h-5 w-5 text-brand" />
        </ProgressRing>
        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate text-[15px] font-semibold text-text">{goal.title}</p>
          <p className="mt-0.5 text-[12px] text-text-mute">até {shortDate(goal.deadline)}</p>
        </div>
        <CardMenu
          actions={[
            { label: 'Contribuir', onClick: onContribute },
            { label: 'Editar', onClick: onEdit, icon: editIcon },
            { label: 'Excluir', onClick: onDelete, icon: deleteIcon, danger: true },
          ]}
        />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="amount text-[18px] font-medium text-text">{money(goal.currentAmount)}</p>
          <p className="text-[12px] text-text-mute">
            {done ? 'Meta alcançada' : `${clampPct(pct).toFixed(0)}% · faltam ${money(left)}`}
          </p>
        </div>
        {done ? (
          <span className="rounded-full bg-lime px-2.5 py-1 text-[12px] font-semibold text-brand-deep">Concluída</span>
        ) : (
          <button
            onClick={onContribute}
            className="rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-medium text-brand transition hover:bg-brand hover:text-canvas focus-ring"
          >
            Contribuir
          </button>
        )}
      </div>
    </Card>
  );
}

export function InstallmentCard({
  plan,
  onPay,
  onEdit,
  onDelete,
}: { plan: InstallmentPlan; onPay: () => void } & CardActions) {
  const paid = plan.totalAmount - plan.remainingAmount;
  const pct = (paid / plan.totalAmount) * 100;
  const settled = plan.remainingAmount <= 0 || plan.installmentsLeft <= 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text">{plan.title}</p>
          <p className="mt-0.5 text-[12px] text-text-mute">
            {plan.category} · vence {shortDate(plan.dueDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cx(
              'rounded-full px-2.5 py-0.5 text-[12px] font-medium',
              settled ? 'bg-lime text-brand-deep' : 'bg-surface-2 text-text-dim',
            )}
          >
            {settled ? 'quitado' : `${plan.installmentsLeft}x restantes`}
          </span>
          <CardMenu
            actions={[
              ...(settled
                ? []
                : [{ label: 'Paguei uma parcela', onClick: onPay, icon: <CheckCircleIcon className="h-4 w-4" /> }]),
              { label: 'Editar', onClick: onEdit, icon: editIcon },
              { label: 'Excluir', onClick: onDelete, icon: deleteIcon, danger: true },
            ]}
          />
        </div>
      </div>
      <div className="space-y-2">
        <ProgressBar pct={pct} />
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-text-mute">
            falta <span className="amount font-medium text-text">{money(plan.remainingAmount)}</span>
          </span>
          <span className="amount text-text-mute">de {money(plan.totalAmount)}</span>
        </div>
      </div>
      {!settled && (
        <button
          onClick={onPay}
          className="mt-1 h-9 rounded-md border border-line text-[13px] font-medium text-text-dim transition hover:border-brand hover:bg-brand-soft hover:text-brand focus-ring"
        >
          Paguei uma parcela
        </button>
      )}
    </Card>
  );
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onPayBill,
}: { account: Account; onPayBill?: (amount: number) => void } & CardActions) {
  const negative = (account.currentBalance ?? 0) < 0;
  const bill = account.creditCard ? Math.max(0, -(account.currentBalance ?? 0)) : 0;
  return (
    <Card className="p-4">
    <div className="flex items-center gap-4">
      <span
        className={cx(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
          account.isJoint ? 'bg-lime text-brand-deep' : 'bg-surface-2 text-text-dim',
        )}
      >
        <BanknotesIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-text">{account.name}</p>
          <span className="eyebrow shrink-0">
            {account.creditCard ? 'Cartão' : account.isJoint ? 'Conjunta' : 'Pessoal'}
          </span>
        </div>
        {/* people only matter on a shared account */}
        {account.isJoint && (
          <div className="mt-1.5">
            <PeopleStack people={account.owners ?? []} />
          </div>
        )}
        {account.creditCard && (account.closingDay || account.dueDay) && (
          <p className="mt-1 text-[12px] text-text-mute">
            {account.closingDay && `fecha dia ${account.closingDay}`}
            {account.closingDay && account.dueDay && ' · '}
            {account.dueDay && `vence dia ${account.dueDay}`}
          </p>
        )}
      </div>
      <span className={cx('amount shrink-0 text-[17px] font-medium', negative ? 'text-expense' : 'text-text')}>
        {money(account.currentBalance)}
      </span>
      <CardMenu
        actions={[
          { label: 'Editar', onClick: onEdit, icon: editIcon },
          { label: 'Excluir', onClick: onDelete, icon: deleteIcon, danger: true },
        ]}
      />
    </div>
      {/* ponytail: bill = whole negative balance; split by closing date if users ask for per-cycle bills */}
      {bill > 0 && onPayBill && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
          <p className="text-[13px] text-text-mute">
            Fatura em aberto <span className="amount font-medium text-text">{money(bill)}</span>
          </p>
          <button
            onClick={() => onPayBill(bill)}
            className="h-8 rounded-md border border-line px-3 text-[13px] font-medium text-text-dim transition hover:border-brand hover:bg-brand-soft hover:text-brand focus-ring"
          >
            Pagar fatura
          </button>
        </div>
      )}
    </Card>
  );
}
