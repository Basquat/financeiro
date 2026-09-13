import { useEffect, useMemo, useState } from 'react';
import { useUpdateSalary } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { useAuth } from '@/hooks/useAuth';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export function SalaryModal() {
  const open = useUi((s) => s.modal === 'salary');
  const close = useUi((s) => s.close);
  const { user } = useAuth();
  const update = useUpdateSalary();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(user?.salary != null ? String(user.salary) : '');
      setError(null);
    }
  }, [open, user?.salary]);

  const value = useMemo(() => parseAmount(amount), [amount]);
  const canSubmit = Number.isFinite(value) && value >= 0;

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Informe um valor válido.');
      return;
    }
    try {
      await update.mutateAsync(value);
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Seu salário mensal"
      description="Usado para estimar o quanto sobra no mês."
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={close} block>
            Cancelar
          </Button>
          <Button onClick={submit} loading={update.isLoading} disabled={!canSubmit} block>
            Salvar
          </Button>
        </div>
      }
    >
      <Field label="Salário líquido mensal">
        {({ id }) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus />}
      </Field>
      {error && <p className="mt-2 text-[13px] text-expense">{error}</p>}
    </Modal>
  );
}
