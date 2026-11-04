import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAccounts } from '@/hooks/useData';
import { apiError } from '@/lib/api';
import { transactionService } from '@/services/transactionService';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export interface TransferPreset {
  toAccountId?: number;
  amount?: number;
  title?: string;
}

/** Moves money between your own accounts; paying a card bill is a transfer to the card. */
export function TransferDialog({ preset, onClose }: { preset: TransferPreset | null; onClose: () => void }) {
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const [from, setFrom] = useState<number | ''>('');
  const [to, setTo] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) return;
    const target = preset.toAccountId ?? accounts[1]?.id ?? '';
    setTo(target);
    setFrom(accounts.find((a) => a.id !== target && !a.creditCard)?.id ?? '');
    setAmount(preset.amount ? preset.amount.toFixed(2).replace('.', ',') : '');
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    const value = parseAmount(amount);
    if (!from || !to || from === to) {
      toast.error('Escolha duas contas diferentes.');
      return;
    }
    if (!(value > 0)) {
      toast.error('Informe o valor.');
      return;
    }
    setSaving(true);
    try {
      await transactionService.transfer(from, to, value);
      toast.success('Transferência registrada');
      void qc.invalidateQueries();
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const select = (id: string, value: number | '', onChange: (v: number) => void) => (
    <select id={id} className="field-input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      <option value="" disabled>
        Escolha a conta
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );

  return (
    <Modal
      open={!!preset}
      onClose={onClose}
      title={preset?.title ?? 'Transferir entre contas'}
      description="Não conta como gasto nem como receita."
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} block>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} loading={saving} block>
            Transferir
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="De">{({ id }) => select(id, from, setFrom)}</Field>
        <Field label="Para">{({ id }) => select(id, to, setTo)}</Field>
        <Field label="Valor">{({ id }) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus />}</Field>
      </div>
    </Modal>
  );
}
