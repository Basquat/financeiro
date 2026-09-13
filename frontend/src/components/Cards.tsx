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
import type { ComponentType, SVGProps } from 'react';
import { clampPct, money, shortDate } from '@/lib/format';
import type { Account, InstallmentPlan, SharedGoal } from '@/types';
import { PeopleStack } from '@/components/ui/Person';
import { CardMenu } from '@/components/ui/Menu';
import { Card, ProgressBar } from '@/components/ui/primitives';

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
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold/15 text-gold">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-1">
          {!done && (
            <button
              onClick={onContribute}
              className="rounded-md px-2 py-1 text-[13px] font-medium text-gold transition hover:bg-gold/10 focus-ring"
            >
              Contribuir
            </button>
          )}
          <CardMenu
            actions={[
              { label: 'Contribuir', onClick: onContribute },
              { label: 'Editar', onClick: onEdit, icon: editIcon },
              { label: 'Excluir', onClick: onDelete, icon: deleteIcon, danger: true },
            ]}
          />
        </div>
      </div>
      <div>
        <p className="text-[14px] font-medium text-text">{goal.title}</p>
        <p className="mt-0.5 text-[12px] text-text-mute">até {shortDate(goal.deadline)}</p>
      </div>
      <div className="space-y-2">
        <ProgressBar pct={pct} tone="income" />
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="amount font-medium text-text">{money(goal.currentAmount)}</span>
          <span className="text-text-mute">
            {done ? 'Meta alcançada 🎉' : `${clampPct(pct).toFixed(0)}% · faltam ${money(left)}`}
          </span>
        </div>
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
          <p className="truncate text-[14px] font-medium text-text">{plan.title}</p>
          <p className="mt-0.5 text-[12px] text-text-mute">
            {plan.category} · vence {shortDate(plan.dueDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-text-dim">
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
          <span className="amount font-medium text-text">{money(plan.remainingAmount)}</span>
          <span className="text-text-mute">de {money(plan.totalAmount)}</span>
        </div>
      </div>
      {!settled && (
        <button
          onClick={onPay}
          className="mt-1 rounded-md border border-line bg-surface-2 py-2 text-[13px] font-medium text-text-dim transition hover:bg-surface-3 hover:text-text focus-ring"
        >
          Paguei uma parcela
        </button>
      )}
    </Card>
  );
}

export function AccountCard({ account, onEdit, onDelete }: { account: Account } & CardActions) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-medium text-text">{account.name}</p>
          <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[11px] text-text-mute">
            {account.isJoint ? 'Conjunta' : 'Pessoal'}
          </span>
        </div>
        <div className="mt-1.5">
          <PeopleStack people={account.owners ?? []} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="amount text-[16px] font-medium text-text">{money(account.currentBalance)}</span>
        <CardMenu
          actions={[
            { label: 'Editar', onClick: onEdit, icon: editIcon },
            { label: 'Excluir', onClick: onDelete, icon: deleteIcon, danger: true },
          ]}
        />
      </div>
    </Card>
  );
}
