import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiError } from '@/lib/api';
import { userService } from '@/services/userService';
import { useAuth, useAuthActions } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

export function EmailModal() {
  const open = useUi((s) => s.modal === 'email');
  const close = useUi((s) => s.close);
  const { user } = useAuth();
  const { patchUser } = useAuthActions();

  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('request');
      setNewEmail('');
      setCode('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function requestCode() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      setError('Digite um e-mail válido.');
      return;
    }
    setBusy(true);
    try {
      const message = await userService.requestEmailChange(newEmail.trim());
      toast.success(message);
      setStep('confirm');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    if (code.trim().length !== 6) {
      setError('O código tem 6 dígitos.');
      return;
    }
    setBusy(true);
    try {
      const { user: updated, message } = await userService.confirmEmailChange(code.trim());
      patchUser({ email: updated.email });
      toast.success(message);
      close();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Alterar e-mail de acesso"
      description={
        step === 'request'
          ? `Atual: ${user?.email ?? ''}`
          : `Enviamos um código de 6 dígitos para ${newEmail}.`
      }
      footer={
        step === 'request' ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={close} block>
              Cancelar
            </Button>
            <Button onClick={requestCode} loading={busy} block>
              Enviar código
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('request')} block>
              Voltar
            </Button>
            <Button onClick={confirm} loading={busy} block>
              Confirmar
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {step === 'request' ? (
          <Field label="Novo e-mail">
            {({ id }) => (
              <input
                id={id}
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="field-input"
                autoFocus
              />
            )}
          </Field>
        ) : (
          <Field label="Código de verificação">
            {({ id }) => (
              <input
                id={id}
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="field-input amount tracking-[0.4em]"
                autoFocus
              />
            )}
          </Field>
        )}
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
