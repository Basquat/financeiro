import { useEffect, useState } from 'react';
import { useCreateAccount, useDeleteAccount, usePartner, useUpdateAccount } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { Account } from '@/types';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button, cx } from '@/components/ui/primitives';

export function AccountModal() {
  const open = useUi((s) => s.modal === 'account');
  const editing = useUi((s) => (s.modal === 'account' ? (s.payload as Account | null) : null));
  const close = useUi((s) => s.close);
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const remove = useDeleteAccount();
  const partnerName = usePartner().data?.partner?.name ?? null;

  const [name, setName] = useState('');
  const [isJoint, setIsJoint] = useState(false);
  const [creditCard, setCreditCard] = useState(false);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setName(editing.name);
      setIsJoint(editing.isJoint);
      setCreditCard(!!editing.creditCard);
      setClosingDay(editing.closingDay ? String(editing.closingDay) : '');
      setDueDay(editing.dueDay ? String(editing.dueDay) : '');
    } else {
      setName('');
      setIsJoint(false);
      setCreditCard(false);
      setClosingDay('');
      setDueDay('');
    }
  }, [open, editing]);

  const canSubmit = name.trim().length > 0;

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Dê um nome para a conta.');
      return;
    }
    const day = (v: string) => (v ? Math.min(31, Math.max(1, Number(v) || 1)) : null);
    const input = {
      name: name.trim(),
      isJoint,
      creditCard,
      closingDay: creditCard ? day(closingDay) : null,
      dueDay: creditCard ? day(dueDay) : null,
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
      title={editing ? 'Editar conta' : 'Nova conta'}
      description={editing ? undefined : 'Uma carteira, conta bancária ou cartão.'}
      footer={
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] text-text-dim">Excluir esta conta?</span>
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
              {editing ? 'Salvar' : 'Criar conta'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          {({ id }) => (
            <input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nubank, Carteira, Cartão Inter…"
              className="field-input"
              autoFocus={!editing}
            />
          )}
        </Field>
        <Field label="Tipo">
          {() => (
            <div className="grid grid-cols-2 gap-2">
              {[
                { joint: false, label: 'Pessoal', hint: 'Só sua' },
                { joint: true, label: 'Conjunta', hint: 'Dividida com alguém' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setIsJoint(opt.joint)}
                  className={cx(
                    'rounded-md border px-3 py-2.5 text-left transition focus-ring',
                    isJoint === opt.joint
                      ? 'border-brand bg-brand/10'
                      : 'border-line bg-surface-2 hover:bg-surface-3',
                  )}
                  aria-pressed={isJoint === opt.joint}
                >
                  <p className="text-[14px] font-medium text-text">{opt.label}</p>
                  <p className="text-[12px] text-text-mute">{opt.hint}</p>
                </button>
              ))}
            </div>
          )}
        </Field>
        {isJoint && !editing && (
          <p className="rounded-md bg-surface-2 px-3 py-2 text-[12px] text-text-mute">
            {partnerName
              ? `Esta conta será compartilhada com ${partnerName}.`
              : 'Para compartilhar, conecte a outra pessoa em Perfil → Conta conjunta.'}
          </p>
        )}
        <label className="flex items-center gap-2.5 text-[14px] text-text">
          <input
            type="checkbox"
            checked={creditCard}
            onChange={(e) => setCreditCard(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--brand))]"
          />
          É um cartão de crédito
        </label>
        {creditCard && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha dia">
              {({ id }) => (
                <input id={id} type="number" min={1} max={31} inputMode="numeric" className="field-input"
                  value={closingDay} onChange={(e) => setClosingDay(e.target.value)} placeholder="3" />
              )}
            </Field>
            <Field label="Vence dia">
              {({ id }) => (
                <input id={id} type="number" min={1} max={31} inputMode="numeric" className="field-input"
                  value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="10" />
              )}
            </Field>
          </div>
        )}
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
