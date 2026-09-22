import { useEffect, useMemo, useState } from 'react';
import { dateInputToIso, todayInput } from '@/lib/format';
import { useAccounts, useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { Transaction, TransactionType } from '@/types';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button, Pill } from '@/components/ui/primitives';

const CATEGORIES = [
  'Mercado',
  'Alimentação',
  'Transporte',
  'Moradia',
  'Utilidades',
  'Saúde',
  'Lazer',
  'Streaming',
  'Educação',
  'Salário',
  'Outros',
];

export function TransactionModal() {
  const open = useUi((s) => s.modal === 'transaction');
  const editing = useUi((s) => (s.modal === 'transaction' ? (s.payload as Transaction | null) : null));
  const close = useUi((s) => s.close);
  const accounts = useAccounts();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState(todayInput());
  const [isInstallment, setIsInstallment] = useState(false);
  const [current, setCurrent] = useState('1');
  const [total, setTotal] = useState('12');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accountOptions = accounts.data ?? [];
  const busy = create.isLoading || update.isLoading || remove.isLoading;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setType(editing.type);
      setTitle(editing.title);
      setAmount(String(Math.abs(editing.amount)).replace('.', ','));
      setCategory(editing.category || CATEGORIES[0]);
      setAccountId(editing.account ? String(editing.account.id) : '');
      setDate(editing.transactionDate.slice(0, 10));
      const inst = Boolean(editing.installmentCurrent && editing.installmentTotal);
      setIsInstallment(inst);
      setCurrent(String(editing.installmentCurrent ?? 1));
      setTotal(String(editing.installmentTotal ?? 12));
    } else {
      setType('EXPENSE');
      setTitle('');
      setAmount('');
      setCategory(CATEGORIES[0]);
      setDate(todayInput());
      setIsInstallment(false);
      setCurrent('1');
      setTotal('12');
    }
  }, [open, editing]);

  useEffect(() => {
    if (open && !accountId && accountOptions.length > 0) {
      setAccountId(String(accountOptions[0].id));
    }
  }, [open, accountId, accountOptions]);

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);
  const canSubmit =
    title.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && accountId !== '';

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Preencha título, valor e conta.');
      return;
    }
    const magnitude = Math.abs(parsedAmount);
    const input = {
      title: title.trim(),
      amount: type === 'EXPENSE' ? -magnitude : magnitude,
      transactionDate: dateInputToIso(date),
      type,
      category,
      accountId: Number(accountId),
      ...(isInstallment
        ? { installmentCurrent: Number(current) || 1, installmentTotal: Number(total) || 1 }
        : {}),
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
      title={editing ? 'Editar transação' : 'Adicionar transação'}
      footer={
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] text-text-dim">Excluir esta transação?</span>
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
              <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Excluir
              </Button>
            ) : (
              <Button variant="ghost" onClick={close} block>
                Cancelar
              </Button>
            )}
            <Button onClick={submit} loading={create.isLoading || update.isLoading} disabled={!canSubmit} block>
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Pill active={type === 'EXPENSE'} onClick={() => setType('EXPENSE')}>
            Despesa
          </Pill>
          <Pill active={type === 'INCOME'} onClick={() => setType('INCOME')}>
            Receita
          </Pill>
        </div>

        <Field label="Valor">
          {({ id }) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus={!editing} />}
        </Field>

        <Field label="Título">
          {({ id }) => (
            <input
              id={id}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Supermercado, aluguel, salário…"
              className="field-input"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            {({ id }) => (
              <select id={id} value={category} onChange={(e) => setCategory(e.target.value)} className="field-input">
                {[category, ...CATEGORIES.filter((c) => c !== category)].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Data">
            {({ id }) => (
              <input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
            )}
          </Field>
        </div>

        <Field
          label="Conta"
          hint={accountOptions.length === 0 ? 'Crie uma conta primeiro no menu Contas.' : undefined}
        >
          {({ id }) => (
            <select
              id={id}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="field-input"
              disabled={accountOptions.length === 0}
            >
              {accountOptions.length === 0 && <option value="">Nenhuma conta</option>}
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <label className="flex items-center gap-2 text-[13px] text-text-dim">
          <input
            type="checkbox"
            checked={isInstallment}
            onChange={(e) => setIsInstallment(e.target.checked)}
            className="h-4 w-4 rounded border-line bg-surface-2 accent-gold"
          />
          É uma parcela
        </label>

        {isInstallment && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcela atual">
              {({ id }) => (
                <input
                  id={id}
                  inputMode="numeric"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ''))}
                  className="field-input amount"
                />
              )}
            </Field>
            <Field label="Total de parcelas">
              {({ id }) => (
                <input
                  id={id}
                  inputMode="numeric"
                  value={total}
                  onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))}
                  className="field-input amount"
                />
              )}
            </Field>
          </div>
        )}

        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
