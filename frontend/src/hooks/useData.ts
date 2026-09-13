import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiError } from '@/lib/api';
import { accountService } from '@/services/accountService';
import { installmentPlanService } from '@/services/installmentPlanService';
import { partnerService } from '@/services/partnerService';
import { sharedGoalService } from '@/services/sharedGoalService';
import { transactionService } from '@/services/transactionService';
import { userService } from '@/services/userService';
import { useAuthActions, useCurrentUser } from '@/hooks/useAuth';
import type {
  AccountInput,
  BudgetSettings,
  InstallmentPlanInput,
  SharedGoalInput,
  TransactionInput,
} from '@/types';

export const keys = {
  transactions: (uid: number) => ['transactions', uid] as const,
  balance: (uid: number) => ['balance', uid] as const,
  accounts: (uid: number) => ['accounts', uid] as const,
  installments: (uid: number) => ['installments', uid] as const,
  goals: () => ['goals'] as const,
  partner: () => ['partner'] as const,
};

/* ---------- queries ---------- */

export function useTransactions() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: keys.transactions(user.id),
    queryFn: () => transactionService.list(user.id),
  });
}

export function useAccounts() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: keys.accounts(user.id),
    queryFn: () => accountService.list(),
  });
}

export function useInstallmentPlans() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: keys.installments(user.id),
    queryFn: () => installmentPlanService.list(user.id),
  });
}

export function useGoals() {
  return useQuery({ queryKey: keys.goals(), queryFn: () => sharedGoalService.list() });
}

export function usePartner() {
  return useQuery({ queryKey: keys.partner(), queryFn: () => partnerService.status() });
}

export function usePartnerActions() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.partner() });
    qc.invalidateQueries({ queryKey: keys.accounts(user.id) });
    qc.invalidateQueries({ queryKey: keys.goals() });
  };
  return {
    createInvite: useMutation({
      mutationFn: () => partnerService.createInvite(),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.partner() }),
      onError: (e) => toast.error(apiError(e)),
    }),
    revokeInvite: useMutation({
      mutationFn: () => partnerService.revokeInvite(),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.partner() });
        toast.success('Convite cancelado');
      },
      onError: (e) => toast.error(apiError(e)),
    }),
    accept: useMutation({
      mutationFn: (code: string) => partnerService.accept(code),
      onSuccess: (r) => {
        refresh();
        toast.success(`Conectado com ${r.partner.name}`);
      },
      onError: (e) => toast.error(apiError(e)),
    }),
    dissolve: useMutation({
      mutationFn: () => partnerService.dissolve(),
      onSuccess: () => {
        refresh();
        toast.success('Parceria desfeita');
      },
      onError: (e) => toast.error(apiError(e)),
    }),
  };
}

/* ---------- shared invalidation ---------- */

function useInvalidateAll() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.transactions(user.id) });
    qc.invalidateQueries({ queryKey: keys.balance(user.id) });
    qc.invalidateQueries({ queryKey: keys.accounts(user.id) });
    qc.invalidateQueries({ queryKey: keys.installments(user.id) });
  };
}

/* ---------- transactions ---------- */

export function useCreateTransaction() {
  const user = useCurrentUser();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: Omit<TransactionInput, 'userId'>) =>
      transactionService.create({ ...input, userId: user.id }),
    onSuccess: () => {
      invalidate();
      toast.success('Transação adicionada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateTransaction() {
  const user = useCurrentUser();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Omit<TransactionInput, 'userId'> }) =>
      transactionService.update(id, { ...input, userId: user.id }),
    onSuccess: () => {
      invalidate();
      toast.success('Transação atualizada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => transactionService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Transação excluída');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

/* ---------- accounts ---------- */

export function useCreateAccount() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: AccountInput) => accountService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success('Conta criada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AccountInput }) => accountService.update(id, input),
    onSuccess: () => {
      invalidate();
      toast.success('Conta atualizada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => accountService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Conta excluída');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

/* ---------- installment plans ---------- */

export function useCreateInstallmentPlan() {
  const user = useCurrentUser();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: Omit<InstallmentPlanInput, 'userId'>) =>
      installmentPlanService.create({ ...input, userId: user.id }),
    onSuccess: () => {
      invalidate();
      toast.success('Parcelamento adicionado');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateInstallmentPlan() {
  const user = useCurrentUser();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Omit<InstallmentPlanInput, 'userId'> }) =>
      installmentPlanService.update(id, { ...input, userId: user.id }),
    onSuccess: () => {
      invalidate();
      toast.success('Parcelamento atualizado');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useDeleteInstallmentPlan() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => installmentPlanService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Parcelamento excluído');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function usePayInstallment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId?: number }) =>
      installmentPlanService.pay(id, accountId),
    onSuccess: () => {
      invalidate();
      toast.success('Parcela registrada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

/* ---------- goals ---------- */

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SharedGoalInput) => sharedGoalService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals() });
      toast.success('Meta criada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SharedGoalInput }) =>
      sharedGoalService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals() });
      toast.success('Meta atualizada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sharedGoalService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals() });
      toast.success('Meta excluída');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useContributeGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, amount }: { goalId: number; amount: number }) =>
      sharedGoalService.contribute(goalId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.goals() });
      toast.success('Contribuição registrada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

/* ---------- salary ---------- */

export function useUpdateSalary() {
  const { patchUser } = useAuthActions();
  return useMutation({
    mutationFn: (salary: number) => userService.updateSalary(salary),
    onSuccess: (user) => {
      patchUser({ salary: user.salary });
      toast.success('Salário atualizado');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateAvatar() {
  const { patchUser } = useAuthActions();
  return useMutation({
    mutationFn: (avatarUrl: string | null) => userService.updateAvatar(avatarUrl),
    onSuccess: (user) => {
      patchUser({ avatarUrl: user.avatarUrl });
      toast.success(user.avatarUrl ? 'Foto atualizada' : 'Foto removida');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useUpdateBudget() {
  const { patchUser } = useAuthActions();
  return useMutation({
    mutationFn: (settings: BudgetSettings) => userService.updateBudget(settings),
    onSuccess: (user) => {
      patchUser({ budget: user.budget });
      toast.success('Plano salvo');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}
