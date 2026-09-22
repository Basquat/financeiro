import { useEffect, useMemo, useState } from 'react';
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import type { SharedGoal } from '@/types';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button, cx } from '@/components/ui/primitives';

const ICONS: Array<{ key: string; label: string }> = [
  { key: 'Home', label: '🏠' },
  { key: 'Plane', label: '✈️' },
  { key: 'Car', label: '🚗' },
  { key: 'Shield', label: '🛡️' },
  { key: 'PiggyBank', label: '🐷' },
  { key: 'Gift', label: '🎁' },
  { key: 'Heart', label: '❤️' },
  { key: 'Sparkles', label: '✨' },
];

export function GoalModal() {
  const open = useUi((s) => s.modal === 'goal');
  const payload = useUi((s) => (s.modal === 'goal' ? s.payload : null));
  const editing = payload && typeof payload === 'object' && 'id' in payload ? (payload as SharedGoal) : null;
  const prefill =
    payload && typeof payload === 'object' && !('id' in payload)
      ? (payload as Partial<SharedGoal>)
      : null;
  const close = useUi((s) => s.close);
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('Home');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    const src = editing ?? prefill;
    setTitle(src?.title ?? '');
    setTarget(src?.targetAmount != null ? String(src.targetAmount).replace('.', ',') : '');
    setDeadline(src?.deadline ? src.deadline.slice(0, 10) : '');
    setIcon(src?.icon || 'Home');
  }, [open, editing, prefill]);

  const targetAmount = useMemo(() => parseAmount(target), [target]);
  const canSubmit =
    title.trim() !== '' && Number.isFinite(targetAmount) && targetAmount > 0 && deadline !== '';

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError('Preencha nome, valor e prazo.');
      return;
    }
    const input = { title: title.trim(), targetAmount, deadline, icon };
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
      title={editing ? 'Editar meta' : 'Nova meta'}
      description={editing ? undefined : 'Um objetivo para alcançar.'}
      footer={
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] text-text-dim">Excluir esta meta?</span>
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
              {editing ? 'Salvar' : 'Criar meta'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <Field label="Nome da meta">
          {({ id }) => (
            <input
              id={id}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrada do apartamento"
              className="field-input"
              autoFocus={!editing}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor alvo">
            {({ id }) => <MoneyInput id={id} value={target} onChange={setTarget} />}
          </Field>
          <Field label="Prazo">
            {({ id }) => (
              <input
                id={id}
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="field-input"
              />
            )}
          </Field>
        </div>
        <Field label="Ícone">
          {() => (
            <div className="flex flex-wrap gap-2">
              {ICONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIcon(opt.key)}
                  className={cx(
                    'flex h-10 w-10 items-center justify-center rounded-md border text-[18px] transition focus-ring',
                    icon === opt.key
                      ? 'border-gold bg-gold/15'
                      : 'border-line bg-surface-2 hover:bg-surface-3',
                  )}
                  aria-pressed={icon === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </Field>
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
