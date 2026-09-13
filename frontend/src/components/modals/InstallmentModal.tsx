import { useEffect, useMemo, useState } from 'react';
import { money } from '@/lib/format';
import {
  useCreateInstallmentPlan,
  useDeleteInstallmentPlan,
  useUpdateInstallmentPlan,
} from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { InstallmentPlan } from '@/types';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export function InstallmentModal() {
  const open = useUi((s) => s.modal === 'installment');
  const editing = useUi((s) => (s.modal === 'installment' ? (s.payload as InstallmentPlan | null) : null));
  const close = useUi((s) => s.close);
  const create = useCreateInstallmentPlan();
  const update = useUpdateInstallmentPlan();
  const remove = useDeleteInstallmentPlan();

  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [installments, setInstallments] = useState('12');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setTitle(editing.title);
      setTotal(String(editing.remainingAmount).replace('.', ','));
      setInstallments(String(editing.installmentsLeft));
      setCategory(editing.category);
      setDueDate(editing.dueDate.slice(0, 10));
    } else {
      setTitle('');
      setTotal('');
      setInstallments('12');
      setCategory('');
      setDueDate('');
    }
  }, [open, editing]);

  const totalAmount = useMemo(() => parseAmount(total), [total]);
  const count = Number(installments) || 0;
  const perInstallment = count > 0 && Number.isFinite(totalAmount) ? totalAmount / count : 0;
  const canSubmit =
    title.trim() !== '' &&
    Number.isFinite(totalAmount) &&
    totalAmount > 0 &&
    count > 0 &&
    category.trim() !== '' &&
    dueDate !== '';

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Preencha todos os campos.');
      return;
    }
    const input = {
      title: title.trim(),
      totalAmount: editing ? editing.totalAmount : totalAmount,
      installmentsLeft: count,
      remainingAmount: editing ? totalAmount : totalAmount,
      category: category.trim(),
      dueDate,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  async function doDelete() {
    if (!editing) return;
    try {
      await remove.mutateAsync(editing.id);
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? 'Editar parcelamento' : 'Adicionar parcelamento'}
      description={editing ? undefined : 'Uma compra que você ainda está pagando em parcelas.'}
      footer={
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] text-text-dim">Excluir este parcelamento?</span>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Não
            </Button>
            <Button variant="danger" onClick={doDelete} loading={remove.isLoading}>
              Excluir
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {editing ? (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            ) : (
              <Button variant="ghost" onClick={close} block>
                Cancelar
              </Button>
            )}
            <Button
              onClick={submit}
              loading={create.isLoading || update.isLoading}
              disabled={!canSubmit}
              block
            >
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <Field label="O que você comprou">
          {({ id }) => (
            <input
              id={id}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notebook, geladeira, viagem…"
              className="field-input"
              autoFocus={!editing}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={editing ? 'Valor restante' : 'Valor total'}>
            {({ id }) => <MoneyInput id={id} value={total} onChange={setTotal} />}
          </Field>
          <Field label="Parcelas restantes">
            {({ id }) => (
              <input
                id={id}
                inputMode="numeric"
                value={installments}
                onChange={(e) => setInstallments(e.target.value.replace(/\D/g, ''))}
                className="field-input amount"
              />
            )}
          </Field>
        </div>
        {perInstallment > 0 && (
          <p className="text-[12px] text-text-mute">
            Aproximadamente <span className="amount text-text-dim">{money(perInstallment)}</span> por parcela.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            {({ id }) => (
              <input
                id={id}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Eletrônicos"
                className="field-input"
              />
            )}
          </Field>
          <Field label="Próximo vencimento">
            {({ id }) => (
              <input
                id={id}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="field-input"
              />
            )}
          </Field>
        </div>
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
