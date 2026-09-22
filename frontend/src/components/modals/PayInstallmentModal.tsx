import { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { useAccounts, usePayInstallment } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { InstallmentPlan } from '@/types';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export function PayInstallmentModal() {
  const plan = useUi((s) => (s.modal === 'pay-installment' ? (s.payload as InstallmentPlan | null) : null));
  const open = useUi((s) => s.modal === 'pay-installment' && s.payload !== null);
  const close = useUi((s) => s.close);
  const accounts = useAccounts();
  const pay = usePayInstallment();

  const [accountId, setAccountId] = useState<string>('');

  const accountOptions = accounts.data ?? [];
  const perInstallment =
    plan && plan.installmentsLeft > 0 ? plan.remainingAmount / plan.installmentsLeft : 0;

  useEffect(() => {
    if (open) setAccountId('');
  }, [open]);

  async function submit() {
    if (!plan) return;
    try {
      await pay.mutateAsync({ id: plan.id, accountId: accountId ? Number(accountId) : undefined });
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar pagamento"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={close} block>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pay.isLoading} block>
            Paguei uma parcela
          </Button>
        </div>
      }
    >
      {plan && (
        <div className="space-y-4">
          <div className="rounded-md bg-surface-2 p-3 text-[13px]">
            <p className="font-medium text-text">{plan.title}</p>
            <p className="mt-1 text-text-mute">
              Parcela de <span className="amount text-text-dim">{money(perInstallment)}</span> ·{' '}
              {plan.installmentsLeft} restantes → {Math.max(0, plan.installmentsLeft - 1)}
            </p>
          </div>

          <Field
            label="Lançar a despesa em"
            hint="Opcional — registra a parcela como uma despesa nessa conta."
          >
            {({ id }) => (
              <select
                id={id}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="field-input"
              >
                <option value="">Não lançar despesa</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      )}
    </Modal>
  );
}
