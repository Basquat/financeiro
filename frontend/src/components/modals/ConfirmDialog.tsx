import { useState } from 'react';
import { useUi } from '@/hooks/useUi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export function ConfirmDialog() {
  const confirm = useUi((s) => s.confirm);
  const clear = useUi((s) => s.clearConfirm);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.onConfirm();
      clear();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={confirm !== null}
      onClose={clear}
      title={confirm?.title ?? ''}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={clear} block>
            Cancelar
          </Button>
          <Button
            variant={confirm?.danger ? 'danger' : 'primary'}
            onClick={run}
            loading={busy}
            block
          >
            {confirm?.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      }
    >
      <p className="text-[14px] text-text-dim">{confirm?.body ?? 'Tem certeza?'}</p>
    </Modal>
  );
}
