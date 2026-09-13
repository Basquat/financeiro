import { useEffect, useMemo, useState } from 'react';
import { money } from '@/lib/format';
import { useContributeGoal } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { SharedGoal } from '@/types';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button, ProgressBar } from '@/components/ui/primitives';

export function ContributeModal() {
  const goal = useUi((s) => (s.modal === 'contribute' ? (s.payload as SharedGoal | null) : null));
  const open = useUi((s) => s.modal === 'contribute' && s.payload !== null);
  const close = useUi((s) => s.close);
  const contribute = useContributeGoal();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setError(null);
    }
  }, [open]);

  const value = useMemo(() => parseAmount(amount), [amount]);
  const canSubmit = Number.isFinite(value) && value > 0;
  const projected = goal ? goal.currentAmount + (canSubmit ? value : 0) : 0;

  async function submit() {
    setError(null);
    if (!goal || !canSubmit) {
      setError('Informe um valor maior que zero.');
      return;
    }
    try {
      await contribute.mutateAsync({ goalId: goal.id, amount: value });
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={goal ? `Contribuir para ${goal.title}` : 'Contribuir'}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={close} block>
            Cancelar
          </Button>
          <Button onClick={submit} loading={contribute.isLoading} disabled={!canSubmit} block>
            Contribuir
          </Button>
        </div>
      }
    >
      {goal && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-md bg-surface-2 p-3">
            <ProgressBar pct={(projected / goal.targetAmount) * 100} tone="income" />
            <div className="flex justify-between text-[12px] text-text-mute">
              <span className="amount">{money(projected)}</span>
              <span>de {money(goal.targetAmount)}</span>
            </div>
          </div>
          <Field label="Valor da contribuição">
            {({ id }) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus />}
          </Field>
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
