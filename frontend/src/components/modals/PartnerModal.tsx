import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { usePartner, usePartnerActions } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { PersonDot } from '@/components/ui/Person';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button, Spinner, cx } from '@/components/ui/primitives';

export function PartnerModal() {
  const open = useUi((s) => s.modal === 'partner');
  const close = useUi((s) => s.close);
  const status = usePartner();
  const { createInvite, revokeInvite, accept, dissolve } = usePartnerActions();

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setCopied(false);
      setConfirmEnd(false);
    }
  }, [open]);

  const data = status.data;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não consegui copiar. Selecione o código manualmente.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Conta conjunta"
      description="Conecte-se a uma pessoa para compartilhar contas conjuntas e metas. Ninguém vê os seus dados sem esse convite."
    >
      {status.isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-text-mute" />
        </div>
      ) : data?.partner ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md bg-surface-2 p-3">
            <PersonDot person={data.partner} />
            <div>
              <p className="text-[14px] font-medium text-text">Conectado com {data.partner.name}</p>
              <p className="text-[12px] text-text-mute">Contas conjuntas e metas são compartilhadas.</p>
            </div>
          </div>
          {confirmEnd ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[13px] text-text-dim">Desfazer a parceria?</span>
              <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
                Não
              </Button>
              <Button
                variant="danger"
                loading={dissolve.isLoading}
                onClick={() => dissolve.mutate(undefined, { onSuccess: close })}
              >
                Desfazer
              </Button>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-text-mute">
                Ao desfazer, cada um fica só com as contas conjuntas que criou. Nada é apagado.
              </p>
              <Button variant="danger" onClick={() => setConfirmEnd(true)} block>
                Desfazer parceria
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-text-dim">Convidar alguém</p>
            {data?.invite ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="amount flex-1 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-center text-[18px] tracking-[0.3em] text-text">
                    {data.invite.code}
                  </code>
                  <Button variant="secondary" onClick={() => copy(data.invite!.code)}>
                    {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <p className="text-[12px] text-text-mute">
                  Envie esse código para a outra pessoa. Ela cola em "Tenho um código". Vale por 7 dias.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => revokeInvite.mutate()}
                  loading={revokeInvite.isLoading}
                >
                  Cancelar convite
                </Button>
              </>
            ) : (
              <Button onClick={() => createInvite.mutate()} loading={createInvite.isLoading}>
                Gerar convite
              </Button>
            )}
          </div>

          <div className="space-y-2 border-t border-line-soft pt-4">
            <Field label="Tenho um código">
              {({ id }) => (
                <input
                  id={id}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  placeholder="ABCD2345"
                  className={cx('field-input amount tracking-[0.2em]')}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              disabled={code.length < 4}
              loading={accept.isLoading}
              onClick={() => accept.mutate(code, { onSuccess: close })}
              block
            >
              Conectar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
