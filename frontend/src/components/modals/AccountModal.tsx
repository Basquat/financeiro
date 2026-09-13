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
  const [isJoint, setIsJoint] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setName(editing.name);
      setIsJoint(editing.isJoint);
    } else {
      setName('');
      setIsJoint(true);
    }
  }, [open, editing]);

  const canSubmit = name.trim().length > 0;

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Dê um nome para a conta.');
      return;
    }
    const input = { name: name.trim(), isJoint };
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
              placeholder="Conta conjunta, Nubank, Carteira…"
              className="field-input"
              autoFocus={!editing}
            />
          )}
        </Field>
        <Field label="Tipo">
          {() => (
            <div className="grid grid-cols-2 gap-2">
              {[
                { joint: true, label: 'Conjunta', hint: 'Compartilhada' },
                { joint: false, label: 'Pessoal', hint: 'Só sua' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setIsJoint(opt.joint)}
                  className={cx(
                    'rounded-md border px-3 py-2.5 text-left transition focus-ring',
                    isJoint === opt.joint
                      ? 'border-gold bg-gold/10'
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
        {isJoint && partnerName && !editing && (
          <p className="rounded-md bg-surface-2 px-3 py-2 text-[12px] text-text-mute">
            Esta conta será compartilhada.
          </p>
        )}
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
